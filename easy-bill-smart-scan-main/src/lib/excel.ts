import * as XLSX from "xlsx";
import type { Sale, Expense, StockMovement, Item } from "./store";

export function exportFullReport(opts: {
  items: Item[];
  sales: Sale[];
  expenses: Expense[];
  movements: StockMovement[];
}) {
  const { items, sales, expenses, movements } = opts;
  const wb = XLSX.utils.book_new();

  // Items / Pricing
  const itemsSheet = items.map((i) => {
    const cost = i.cost ?? 0;
    const profit = i.price - cost;
    return {
      Code: i.code,
      Name: i.name,
      Category: i.category,
      Unit: i.unit,
      Stock: i.stock ?? 0,
      "Buy Price": cost,
      "Sell Price": i.price,
      "Profit / unit": profit,
      "Margin %": i.price ? +((profit / i.price) * 100).toFixed(2) : 0,
    };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(itemsSheet), "Items");

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(itemsSheet), "Items");

  // Weighted Pricing — 1/4, 1/2, 3/4, 1 kg/litre breakdown
  const fractions = [0.25, 0.5, 0.75, 1] as const;
  const weighted = items
    .filter((i) => i.unit === "kg" || i.unit === "litre" || i.unit === "g" || i.unit === "ml")
    .map((i) => {
      const cost = i.cost ?? 0;
      const row: Record<string, string | number> = {
        Code: i.code,
        Name: i.name,
        Category: i.category,
        Unit: i.unit,
        "Buy / unit": cost,
        "Sell / unit": i.price,
        "Profit / unit": +(i.price - cost).toFixed(2),
      };
      for (const f of fractions) {
        const label = f === 0.25 ? "1/4" : f === 0.5 ? "1/2" : f === 0.75 ? "3/4" : "1";
        row[`Buy ${label}`] = +(cost * f).toFixed(2);
        row[`Sell ${label}`] = +(i.price * f).toFixed(2);
        row[`Profit ${label}`] = +((i.price - cost) * f).toFixed(2);
      }
      return row;
    });
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      weighted.length ? weighted : [{ Note: "No weighted items (kg/litre/g/ml) found" }]
    ),
    "Weighted Pricing"
  );
  const salesSheet = sales.map((s) => ({
    Invoice: s.invoice,
    Date: new Date(s.date).toLocaleString(),
    Items: s.lines.length,
    Subtotal: s.subtotal,
    Tax: s.tax,
    Total: s.total,
    Profit: s.profit,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(salesSheet), "Sales");

  // Sale lines (detailed)
  const lines = sales.flatMap((s) =>
    s.lines.map((l) => ({
      Invoice: s.invoice,
      Date: new Date(s.date).toLocaleString(),
      Code: l.code,
      Name: l.name,
      Unit: l.unit,
      Qty: l.qty,
      Price: l.price,
      Cost: l.cost ?? 0,
      Total: +(l.qty * l.price).toFixed(2),
      Profit: +((l.price - (l.cost ?? 0)) * l.qty).toFixed(2),
    }))
  );
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(lines), "Sale Lines");

  // Expenses
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      expenses.map((e) => ({
        Date: new Date(e.date).toLocaleDateString(),
        Category: e.category,
        Description: e.description,
        Amount: e.amount,
      }))
    ),
    "Expenses"
  );

  // Stock Movements
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      movements.map((m) => ({
        Date: new Date(m.date).toLocaleString(),
        Type: m.type.toUpperCase(),
        Code: m.code,
        Name: m.name,
        Unit: m.unit,
        Qty: m.qty,
        Cost: m.cost ?? "",
        Value: m.cost ? +(m.qty * m.cost).toFixed(2) : "",
        Note: m.note ?? "",
      }))
    ),
    "Stock Movements"
  );

  // Daily summary
  const byDay: Record<string, { date: string; revenue: number; profit: number; expenses: number }> = {};
  sales.forEach((s) => {
    const k = s.date.slice(0, 10);
    byDay[k] ??= { date: k, revenue: 0, profit: 0, expenses: 0 };
    byDay[k].revenue += s.total;
    byDay[k].profit += s.profit;
  });
  expenses.forEach((e) => {
    const k = e.date.slice(0, 10);
    byDay[k] ??= { date: k, revenue: 0, profit: 0, expenses: 0 };
    byDay[k].expenses += e.amount;
  });
  const daily = Object.values(byDay)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) => ({ ...r, "Net Profit": +(r.profit - r.expenses).toFixed(2) }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(daily), "Daily Summary");

  // Monthly summary
  const byMonth: Record<string, { month: string; revenue: number; profit: number; expenses: number }> = {};
  sales.forEach((s) => {
    const k = s.date.slice(0, 7);
    byMonth[k] ??= { month: k, revenue: 0, profit: 0, expenses: 0 };
    byMonth[k].revenue += s.total;
    byMonth[k].profit += s.profit;
  });
  expenses.forEach((e) => {
    const k = e.date.slice(0, 7);
    byMonth[k] ??= { month: k, revenue: 0, profit: 0, expenses: 0 };
    byMonth[k].expenses += e.amount;
  });
  const monthly = Object.values(byMonth)
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((r) => ({ ...r, "Net Profit": +(r.profit - r.expenses).toFixed(2) }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(monthly), "Monthly Summary");

  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `freshmart-report-${stamp}.xlsx`);
}
