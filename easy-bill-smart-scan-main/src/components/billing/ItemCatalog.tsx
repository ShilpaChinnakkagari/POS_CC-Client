// src/components/billing/ItemCatalog.tsx
import { useMemo, useState } from "react";
import { Item, formatMoney, useItems } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Search, AlertTriangle } from "lucide-react";

export function ItemCatalog({ onPick }: { onPick: (item: Item) => void }) {
  const { items } = useItems();
  const [q, setQ] = useState("");

  const grouped = useMemo(() => {
    const filtered = items.filter(
      (i) =>
        i.code.includes(q) ||
        i.name.toLowerCase().includes(q.toLowerCase()) ||
        i.category.toLowerCase().includes(q.toLowerCase())
    );
    const map = new Map<string, Item[]>();
    filtered
      .sort((a, b) => a.code.localeCompare(b.code))
      .forEach((i) => {
        if (!map.has(i.category)) map.set(i.category, []);
        map.get(i.category)!.push(i);
      });
    return Array.from(map.entries());
  }, [items, q]);

  // ✅ Count low stock items
  const lowStockCount = items.filter(i => (i.stock || 0) <= 10 && (i.stock || 0) > 0).length;
  const outOfStockCount = items.filter(i => (i.stock || 0) <= 0).length;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search code, name, category"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
        {/* ✅ Stock Alert Summary */}
        <div className="mt-2 flex gap-2 text-xs">
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
          {outOfStockCount === 0 && lowStockCount === 0 && (
            <span className="text-green-600 font-medium">✅ All items in stock</span>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {grouped.length === 0 && (
          <p className="px-2 py-8 text-center text-sm text-muted-foreground">No items.</p>
        )}
        {grouped.map(([cat, list]) => (
          <div key={cat} className="mb-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {cat}
            </h3>
            <ul className="space-y-1">
              {list.map((i) => {
                const stock = i.stock || 0;
                const isOutOfStock = stock <= 0;
                const isLowStock = stock > 0 && stock <= 10;
                
                return (
                  <li key={i.code}>
                    <button
                      onClick={() => {
                        if (!isOutOfStock) onPick(i);
                      }}
                      disabled={isOutOfStock}
                      className={`group flex w-full items-center justify-between rounded-md border px-3 py-2 text-left transition ${
                        isOutOfStock
                          ? 'border-red-200 bg-red-50/30 opacity-60 cursor-not-allowed'
                          : isLowStock
                          ? 'border-yellow-300 bg-yellow-50/30 hover:border-yellow-500 hover:bg-yellow-50/60'
                          : 'border-border bg-card hover:border-primary/40 hover:bg-accent/40 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`rounded px-2 py-0.5 font-mono text-xs font-bold ${
                          isOutOfStock ? 'bg-red-100 text-red-600' :
                          isLowStock ? 'bg-yellow-100 text-yellow-700' :
                          'bg-primary/10 text-primary'
                        }`}>
                          {i.code}
                        </span>
                        <div>
                          <div className="text-sm font-medium leading-tight">{i.name}</div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground">per {i.unit}</span>
                            <span className={`font-semibold ${
                              isOutOfStock ? 'text-red-500' :
                              isLowStock ? 'text-yellow-600' :
                              'text-green-600'
                            }`}>
                              {stock > 0 ? `${stock} in stock` : '0 in stock'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="font-mono text-sm font-semibold">{formatMoney(i.price)}</span>
                        {isOutOfStock && (
                          <span className="text-[10px] font-bold uppercase text-red-500 animate-pulse">
                            ⚠️ OUT OF STOCK
                          </span>
                        )}
                        {isLowStock && (
                          <span className="text-[10px] font-bold uppercase text-yellow-600">
                            ⚠️ LOW STOCK
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}