import { useMemo, useState } from "react";
import { formatMoney, useExpenses, useSales, useStockMovements, useItems } from "@/lib/store";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { exportFullReport } from "@/lib/excel";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";

function ymd(iso: string) { return iso.slice(0, 10); }
function ym(iso: string) { return iso.slice(0, 7); }

export function ReportsTab() {
  const { items } = useItems();

  const { sales } = useSales();
  const { expenses } = useExpenses();
  const { movements } = useStockMovements();
  const today = new Date().toISOString().slice(0, 10);
  const [day, setDay] = useState(today);
  const [month, setMonth] = useState(today.slice(0, 7));

  // Day totals
  const daySales = sales.filter((s) => ymd(s.date) === day);
  const dayRevenue = daySales.reduce((s, x) => s + x.total, 0);
  const dayProfit = daySales.reduce((s, x) => s + x.profit, 0);
  const dayExpenses = expenses.filter((e) => ymd(e.date) === day);
  const dayExpTotal = dayExpenses.reduce((s, e) => s + e.amount, 0);
  const dayNet = dayProfit - dayExpTotal;

  // Month totals
  const monthSales = sales.filter((s) => ym(s.date) === month);
  const monthRevenue = monthSales.reduce((s, x) => s + x.total, 0);
  const monthProfit = monthSales.reduce((s, x) => s + x.profit, 0);
  const monthExpenses = expenses.filter((e) => ym(e.date) === month);
  const monthExpTotal = monthExpenses.reduce((s, e) => s + e.amount, 0);
  const monthNet = monthProfit - monthExpTotal;

  // Stock totals
  const stockIn = movements.filter((m) => m.type === "in");
  const stockOut = movements.filter((m) => m.type === "out");
  const stockInValue = stockIn.reduce((s, m) => s + m.qty * (m.cost ?? 0), 0);
  const stockOutQty = stockOut.reduce((s, m) => s + m.qty, 0);
  const stockInQty = stockIn.reduce((s, m) => s + m.qty, 0);

  // Monthly bar chart data (last 12 months)
  const chartData = useMemo(() => {
    const months: Record<string, { month: string; revenue: number; profit: number; expenses: number }> = {};
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toISOString().slice(0, 7);
      months[key] = {
        month: d.toLocaleDateString(undefined, { month: "short", year: "2-digit" }),
        revenue: 0, profit: 0, expenses: 0,
      };
    }
    sales.forEach((s) => {
      const k = ym(s.date);
      if (months[k]) { months[k].revenue += s.total; months[k].profit += s.profit; }
    });
    expenses.forEach((e) => {
      const k = ym(e.date);
      if (months[k]) months[k].expenses += e.amount;
    });
    return Object.values(months);
  }, [sales, expenses]);

  return (
    <Tabs defaultValue="overview" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="day">Day</TabsTrigger>
          <TabsTrigger value="month">Month</TabsTrigger>
          <TabsTrigger value="stock">Stock</TabsTrigger>
        </TabsList>
        <Button
          onClick={() => {
            exportFullReport({ items, sales, expenses, movements });
            toast.success("Excel report downloaded");
          }}
        >
          <Download className="mr-1 h-4 w-4" /> Export Excel
        </Button>
      </div>


      <TabsContent value="overview" className="space-y-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">
            Last 12 months
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(v: number) => formatMoney(v)} />
                <Legend />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" name="Revenue" />
                <Bar dataKey="profit" fill="#16a34a" name="Profit" />
                <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Total Sales" value={formatMoney(sales.reduce((s,x)=>s+x.total,0))} />
          <Stat label="Total Profit" value={formatMoney(sales.reduce((s,x)=>s+x.profit,0))} accent="text-green-600" />
          <Stat label="Total Expenses" value={formatMoney(expenses.reduce((s,e)=>s+e.amount,0))} accent="text-red-600" />
          <Stat label="Total Bills" value={sales.length.toString()} />
        </div>
      </TabsContent>

      <TabsContent value="day" className="space-y-4">
        <div className="flex items-end gap-3">
          <div>
            <Label>Date</Label>
            <Input type="date" value={day} onChange={(e) => setDay(e.target.value)} />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Revenue" value={formatMoney(dayRevenue)} />
          <Stat label="Gross Profit" value={formatMoney(dayProfit)} accent="text-green-600" />
          <Stat label="Expenses" value={formatMoney(dayExpTotal)} accent="text-red-600" />
          <Stat label="Net Profit" value={formatMoney(dayNet)} accent={dayNet>=0?"text-green-600":"text-red-600"} />
        </div>
        <SalesTable sales={daySales} />
        <ExpenseTable expenses={dayExpenses} />
      </TabsContent>

      <TabsContent value="month" className="space-y-4">
        <div className="flex items-end gap-3">
          <div>
            <Label>Month</Label>
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Revenue" value={formatMoney(monthRevenue)} />
          <Stat label="Gross Profit" value={formatMoney(monthProfit)} accent="text-green-600" />
          <Stat label="Expenses" value={formatMoney(monthExpTotal)} accent="text-red-600" />
          <Stat label="Net Profit" value={formatMoney(monthNet)} accent={monthNet>=0?"text-green-600":"text-red-600"} />
        </div>
        <SalesTable sales={monthSales} />
        <ExpenseTable expenses={monthExpenses} />
      </TabsContent>

      <TabsContent value="stock" className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Stock In (qty)" value={stockInQty.toFixed(2)} />
          <Stat label="Stock In (value)" value={formatMoney(stockInValue)} />
          <Stat label="Stock Out (qty)" value={stockOutQty.toFixed(2)} />
          <Stat label="Movements" value={movements.length.toString()} />
        </div>
        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.length === 0 && (
                <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No movements yet.
                </TableCell></TableRow>
              )}
              {movements.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-mono text-xs">{new Date(m.date).toLocaleString()}</TableCell>
                  <TableCell>
                    <span className={m.type==="in"?"text-green-600 font-medium":"text-red-600 font-medium"}>
                      {m.type.toUpperCase()}
                    </span>
                  </TableCell>
                  <TableCell>{m.name} <span className="text-xs text-muted-foreground">({m.code})</span></TableCell>
                  <TableCell className="text-right font-mono">{m.qty.toFixed(2)} {m.unit}</TableCell>
                  <TableCell className="text-right font-mono">
                    {m.cost ? formatMoney(m.qty * m.cost) : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{m.note ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TabsContent>
    </Tabs>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-lg border-2 border-border bg-card p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-foreground/70">{label}</p>
      <p className={`mt-2 font-mono text-2xl font-bold ${accent ?? "text-primary"}`}>{value}</p>
    </div>
  );
}


function SalesTable({ sales }: { sales: ReturnType<typeof useSales>["sales"] }) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="border-b border-border bg-muted/30 px-4 py-2 text-sm font-semibold">
        Sales ({sales.length})
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Items</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Profit</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sales.length === 0 && (
            <TableRow><TableCell colSpan={5} className="py-6 text-center text-muted-foreground">No sales.</TableCell></TableRow>
          )}
          {sales.map((s) => (
            <TableRow key={s.invoice}>
              <TableCell className="font-mono text-xs">{s.invoice}</TableCell>
              <TableCell className="text-xs">{new Date(s.date).toLocaleString()}</TableCell>
              <TableCell className="text-right">{s.lines.length}</TableCell>
              <TableCell className="text-right font-mono">{formatMoney(s.total)}</TableCell>
              <TableCell className="text-right font-mono text-green-600">{formatMoney(s.profit)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ExpenseTable({ expenses }: { expenses: ReturnType<typeof useExpenses>["expenses"] }) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="border-b border-border bg-muted/30 px-4 py-2 text-sm font-semibold">
        Expenses ({expenses.length})
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.length === 0 && (
            <TableRow><TableCell colSpan={4} className="py-6 text-center text-muted-foreground">No expenses.</TableCell></TableRow>
          )}
          {expenses.map((e) => (
            <TableRow key={e.id}>
              <TableCell className="text-xs">{new Date(e.date).toLocaleDateString()}</TableCell>
              <TableCell>{e.category}</TableCell>
              <TableCell className="text-muted-foreground text-sm">{e.description}</TableCell>
              <TableCell className="text-right font-mono text-red-600">{formatMoney(e.amount)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
