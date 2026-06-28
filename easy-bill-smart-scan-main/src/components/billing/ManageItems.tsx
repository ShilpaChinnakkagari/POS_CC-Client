// src/components/billing/ManageItems.tsx
import { useItems, formatMoney, useStockMovements } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { AddItemDialog } from "./AddItemDialog";
import { StockInDialog } from "./StockInDialog";
import { ReturnDialog } from "./ReturnDialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { useMemo } from "react";

export function ManageItems() {
  const { items, removeItem } = useItems();
  const { movements } = useStockMovements();

  // ✅ Count low stock items
  const lowStockCount = items.filter(i => (i.stock || 0) <= 10 && (i.stock || 0) > 0).length;
  const outOfStockCount = items.filter(i => (i.stock || 0) <= 0).length;

  const totals = useMemo(() => {
    const m: Record<string, { in: number; out: number }> = {};
    movements.forEach((mv) => {
      m[mv.code] ??= { in: 0, out: 0 };
      if (mv.type === "in") m[mv.code].in += mv.qty;
      else m[mv.code].out += mv.qty;
    });
    return m;
  }, [movements]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Item Catalog</h2>
          <p className="text-sm text-muted-foreground">
            {items.length} items · Stocked, Sold and Balance update live.
          </p>
          {/* ✅ Stock Alert Summary */}
          <div className="mt-1 flex gap-2 text-xs">
            {outOfStockCount > 0 && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-600 font-medium">
                ⚠️ {outOfStockCount} Out of Stock
              </span>
            )}
            {lowStockCount > 0 && (
              <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-yellow-700 font-medium">
                ⚠️ {lowStockCount} Low Stock
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <ReturnDialog />
          <StockInDialog />
          <AddItemDialog />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead className="text-right">Stocked</TableHead>
              <TableHead className="text-right">Sold</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead className="text-right">Buy</TableHead>
              <TableHead className="text-right">Sell</TableHead>
              <TableHead className="text-right">Profit/u</TableHead>
              <TableHead className="text-right">Margin</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.sort((a, b) => a.code.localeCompare(b.code)).map((i) => {
              const cost = i.cost ?? 0;
              const profit = i.price - cost;
              const margin = i.price > 0 ? (profit / i.price) * 100 : 0;
              const balance = i.stock ?? 0;
              const t = totals[i.code] ?? { in: 0, out: 0 };
              const isLowStock = balance > 0 && balance <= 10;
              const isOutOfStock = balance <= 0;
              
              return (
                <TableRow 
                  key={i.code} 
                  className={`transition-colors hover:bg-muted/40 ${
                    isOutOfStock ? 'bg-red-50/50' :
                    isLowStock ? 'bg-yellow-50/50' : ''
                  }`}
                >
                  <TableCell className="font-mono font-semibold text-primary">{i.code}</TableCell>
                  <TableCell className="font-medium">
                    {i.name}
                    {isOutOfStock && (
                      <span className="ml-2 text-[10px] font-bold uppercase text-red-500">OUT OF STOCK</span>
                    )}
                    {isLowStock && (
                      <span className="ml-2 text-[10px] font-bold uppercase text-yellow-600">LOW STOCK</span>
                    )}
                  </TableCell>
                  <TableCell>{i.category}</TableCell>
                  <TableCell>{i.unit}</TableCell>
                  <TableCell className="text-right font-mono text-brand-cyan">+{t.in.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono text-accent">-{t.out.toFixed(2)}</TableCell>
                  <TableCell className={`text-right font-mono font-bold ${
                    isOutOfStock ? 'text-red-600' :
                    isLowStock ? 'text-yellow-600' :
                    'text-success'
                  }`}>
                    {balance.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-mono">{formatMoney(cost)}</TableCell>
                  <TableCell className="text-right font-mono">{formatMoney(i.price)}</TableCell>
                  <TableCell className="text-right font-mono text-success">{formatMoney(profit)}</TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">{margin.toFixed(1)}%</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon"
                      onClick={() => { removeItem(i.code); toast.success(`Removed ${i.name}`); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}