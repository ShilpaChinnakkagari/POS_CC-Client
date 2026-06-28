// src/components/billing/BillingScreen.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CartLine, formatMoney, isWeighted, SaleType, useItems, useSales, useShop, useStockMovements,
} from "@/lib/store";
import { ItemCatalog } from "./ItemCatalog";
import { Receipt } from "./Receipt";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Download, FileText, Minus, Plus, Printer, Trash2, X, Receipt as ReceiptIcon,
  User, BadgeIndianRupee, Eye, Settings,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import jsPDF from "jspdf";
import { CustomerSelect } from "./CustomerSelect";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { KeyboardShortcutsHelp } from "@/components/ui/KeyboardShortcutsHelp";

const QUICK_QTY = [0.25, 0.5, 0.75, 1];

export function BillingScreen() {
  const { findByCode, adjustStock } = useItems();
  const { shop } = useShop();
  const { addSale } = useSales();
  const { addMovement } = useStockMovements();
  const [code, setCode] = useState("");
  const [qty, setQty] = useState("1");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [showReceipt, setShowReceipt] = useState(false);
  const [invoice, setInvoice] = useState(() => "INV-" + Date.now().toString().slice(-6));
  const [committed, setCommitted] = useState(false);
  const [customer, setCustomer] = useState("Customer");
  const [cashier, setCashier] = useState("Admin");
  const [saleType, setSaleType] = useState<SaleType>("Cash");
  const [discountInput, setDiscountInput] = useState("0");
  const [saving, setSaving] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => { codeRef.current?.focus(); }, []);

  const subtotal = useMemo(
    () => cart.reduce((s, l) => s + l.qty * l.price, 0),
    [cart]
  );
  const discount = Math.max(0, Math.min(parseFloat(discountInput) || 0, subtotal));
  const taxable = Math.max(0, subtotal - discount);
  const tax = (taxable * shop.taxPercent) / 100;
  const total = taxable + tax;
  const profit = useMemo(
    () => cart.reduce((s, l) => s + l.qty * (l.price - (l.cost ?? 0)), 0) - discount,
    [cart, discount]
  );
  const mrpTotal = useMemo(
    () => cart.reduce((s, l) => s + l.qty * (l.mrp ?? l.price), 0),
    [cart]
  );

  const previewItem = findByCode(code.trim());

  const addCode = (rawCode?: string, rawQty?: string) => {
    const c = (rawCode ?? code).trim();
    if (!c) {
      toast.error("Please enter an item code");
      return;
    }
    
    const item = findByCode(c);
    if (!item) {
      toast.error(`No item with code ${c}`);
      return;
    }
    
    const q = parseFloat((rawQty ?? qty) || "1");
    if (isNaN(q) || q <= 0) {
      toast.error("Invalid quantity");
      return;
    }
    
    const currentStock = item.stock || 0;
    const existingInCart = cart.find((l) => l.code === item.code);
    const currentCartQty = existingInCart ? existingInCart.qty : 0;
    const totalRequested = currentCartQty + q;
    
    if (totalRequested > currentStock) {
      toast.error(`Only ${currentStock} ${item.unit}(s) available in stock!`);
      return;
    }
    
    setCart((prev) => {
      const existing = prev.find((l) => l.code === item.code);
      if (existing) {
        return prev.map((l) =>
          l.code === item.code ? { ...l, qty: +(l.qty + q).toFixed(3) } : l
        );
      }
      return [...prev, {
        code: item.code, name: item.name, unit: item.unit,
        price: item.price, qty: q, cost: item.cost, mrp: item.mrp,
      }];
    });
    setCode("");
    setQty("1");
    codeRef.current?.focus();
  };

  const updateQty = (c: string, q: number) => {
    if (q <= 0) {
      setCart((prev) => prev.filter((l) => l.code !== c));
      return;
    }
    
    const item = findByCode(c);
    if (item) {
      const currentStock = item.stock || 0;
      if (q > currentStock) {
        toast.error(`Only ${currentStock} ${item.unit}(s) available in stock!`);
        return;
      }
    }
    
    setCart((prev) => prev.map((l) => (l.code === c ? { ...l, qty: +q.toFixed(3) } : l)));
  };

  const remove = (c: string) => setCart((prev) => prev.filter((l) => l.code !== c));
  const clear = () => {
    setCart([]);
    setCommitted(false);
    setInvoice("INV-" + Date.now().toString().slice(-6));
    setDiscountInput("0");
    setCustomer("Customer");
  };

  const commitSale = async () => {
    if (committed || cart.length === 0) {
      console.log('⚠️ Sale already committed or cart empty');
      return;
    }
    
    for (const line of cart) {
      const item = findByCode(line.code);
      if (!item) {
        toast.error(`Item ${line.code} not found!`);
        return;
      }
      const currentStock = item.stock || 0;
      if (line.qty > currentStock) {
        toast.error(`Not enough stock for ${item.name}! Available: ${currentStock} ${item.unit}(s)`);
        return;
      }
    }
    
    setSaving(true);
    try {
      const date = new Date().toISOString();
      
      const saleData = {
        invoice,
        date,
        lines: cart.map(l => ({
          code: l.code,
          name: l.name,
          unit: l.unit,
          price: l.price,
          qty: l.qty,
          cost: l.cost || 0,
          mrp: l.mrp || l.price,
        })),
        subtotal,
        discount,
        tax,
        total,
        profit,
        customer: customer.trim() || "Customer",
        cashier: cashier.trim() || "Admin",
        saleType,
      };
      
      console.log('💾 Committing sale to Firebase:', saleData);
      
      await addSale(saleData);
      console.log('✅ Sale saved to Firebase');
      
      for (const l of cart) {
        await adjustStock(l.code, -l.qty);
        await addMovement({
          id: "MV-" + Date.now() + "-" + l.code,
          date,
          code: l.code,
          name: l.name,
          unit: l.unit,
          qty: l.qty,
          type: "out",
          cost: l.cost,
          note: invoice,
        });
      }
      
      setCommitted(true);
      toast.success(`Bill ${invoice} saved to Firebase!`);
    } catch (error) {
      console.error('❌ Error committing sale:', error);
      toast.error('Failed to save bill. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const openPreview = () => {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    setShowReceipt(true);
  };

  const doPrint = async () => {
    await commitSale();
    const node = document.getElementById("receipt-print");
    if (!node) { toast.error("Receipt not ready"); return; }
    const html = node.outerHTML;
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument!;
    doc.open();
    doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${invoice}</title>
<style>
  body{font-family:ui-monospace,Menlo,Consolas,monospace;margin:0;padding:0;color:#000;background:#fff}
  #receipt-print{width:80mm;padding:6mm 4mm;margin:0 auto}
  table{width:100%;border-collapse:collapse;font-size:11px}
  th,td{padding:2px 0}
  .bdash,div[class*="border-dashed"]{border-top:1px dashed #000;margin:6px 0}
  @page{margin:0;size:80mm auto}
</style></head><body>${html}</body></html>`);
    doc.close();
    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 500);
      }, 100);
    };
    toast.success("Opening print dialog…");
  };

  const onDownloadHTML = async () => {
    await commitSale();
    const node = document.getElementById("receipt-print");
    const html = node?.outerHTML ?? "";
    const doc = `<!doctype html><html><head><meta charset="utf-8"><title>${invoice}</title>
<style>body{font-family:ui-monospace,Menlo,monospace;margin:0;padding:16px;color:#000;background:#fff}
#receipt-print{width:300px;margin:0 auto}
table{width:100%;border-collapse:collapse}
@media print{@page{margin:0;size:80mm auto}body{padding:0}}
</style></head><body>${html}</body></html>`;
    const blob = new Blob([doc], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${invoice}.html`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Receipt HTML saved");
  };

  const onDownloadPDF = async () => {
    if (cart.length === 0) return;
    await commitSale();
    const lineH = 4.5;
    const estLines = 14 + cart.length * 2;
    const pageH = Math.max(120, 30 + estLines * lineH);
    const pdf = new jsPDF({ unit: "mm", format: [80, pageH] });
    const W = 80;
    let y = 8;
    pdf.setFont("courier", "bold");
    pdf.setFontSize(12);
    pdf.text(shop.name, W / 2, y, { align: "center" }); y += 5;
    pdf.setFont("courier", "normal");
    pdf.setFontSize(8);
    pdf.text(shop.address, W / 2, y, { align: "center" }); y += 4;
    pdf.text(`Tel: ${shop.phone}`, W / 2, y, { align: "center" }); y += 4;
    pdf.setLineDashPattern([0.6, 0.6], 0);
    pdf.line(4, y, W - 4, y); y += 4;

    pdf.setFontSize(8);
    pdf.text(`Inv: ${invoice}`, 4, y);
    pdf.text(new Date().toLocaleString(), W - 4, y, { align: "right" }); y += 4;
    pdf.text(`Customer: ${customer || "Customer"}`, 4, y);
    pdf.text(saleType, W - 4, y, { align: "right" }); y += 4;
    pdf.text(`Cashier: ${cashier || "Admin"}`, 4, y); y += 3;
    pdf.line(4, y, W - 4, y); y += 4;

    pdf.setFont("courier", "bold");
    pdf.text("Item", 4, y);
    pdf.text("Qty", 42, y, { align: "right" });
    pdf.text("Rate", 58, y, { align: "right" });
    pdf.text("Amt", W - 4, y, { align: "right" }); y += 3;
    pdf.line(4, y, W - 4, y); y += 4;
    pdf.setFont("courier", "normal");

    cart.forEach((l) => {
      const name = l.name.length > 22 ? l.name.slice(0, 22) : l.name;
      pdf.text(name, 4, y);
      pdf.text(`${l.qty}${l.unit}`, 42, y, { align: "right" });
      pdf.text(l.price.toFixed(2), 58, y, { align: "right" });
      pdf.text((l.qty * l.price).toFixed(2), W - 4, y, { align: "right" });
      y += 3.8;
      pdf.setFontSize(7);
      pdf.text(`#${l.code}  MRP ${(l.mrp ?? l.price).toFixed(2)}`, 4, y);
      y += 4;
      pdf.setFontSize(8);
    });

    pdf.line(4, y, W - 4, y); y += 4;
    const row = (k: string, v: string, bold = false) => {
      pdf.setFont("courier", bold ? "bold" : "normal");
      pdf.setFontSize(bold ? 11 : 9);
      pdf.text(k, 4, y);
      pdf.text(v, W - 4, y, { align: "right" });
      y += bold ? 6 : 4.5;
    };
    row("Subtotal", formatMoney(subtotal));
    if (discount > 0) row("Discount", `- ${formatMoney(discount)}`);
    row(`GST (${shop.taxPercent}%)`, formatMoney(tax));
    pdf.line(4, y, W - 4, y); y += 4;
    row("TOTAL", formatMoney(total), true);

    pdf.setFontSize(8);
    pdf.text("Thank you for shopping!", W / 2, y + 2, { align: "center" });

    pdf.save(`${invoice}.pdf`);
    toast.success("PDF downloaded");
  };

  // ✅ Keyboard Shortcuts
  useKeyboardShortcuts({
    onNewBill: () => {
      if (cart.length === 0) return;
      if (confirm("Clear current bill?")) {
        clear();
        toast.info("New bill started");
      }
    },
    onPrint: () => {
      if (cart.length === 0) {
        toast.error("Cart is empty");
        return;
      }
      doPrint();
    },
    onSave: () => {
      if (cart.length === 0) {
        toast.error("Cart is empty");
        return;
      }
      doPrint();
    },
    onSearch: () => {
      codeRef.current?.focus();
    },
    onClear: () => {
      if (cart.length === 0) return;
      if (confirm("Clear all items?")) {
        clear();
        toast.info("Cart cleared");
      }
    },
    onFocusCode: () => {
      codeRef.current?.focus();
      codeRef.current?.select();
    },
    onFocusCustomer: () => {
      const customerInput = document.querySelector('input[placeholder*="Customer"]') as HTMLInputElement;
      if (customerInput) {
        customerInput.focus();
        customerInput.select();
      }
    },
    onCancel: () => {
      if (cart.length > 0) {
        if (confirm("Clear current bill?")) {
          clear();
          toast.info("Cart cleared");
        }
      }
    },
    onPreview: () => {
      if (cart.length === 0) {
        toast.error("Cart is empty");
        return;
      }
      openPreview();
    },
  });

  return (
    <div className="grid min-h-[calc(100vh-9rem)] grid-cols-1 gap-4 lg:h-[calc(100vh-9rem)] lg:grid-cols-[300px_1fr_340px] xl:grid-cols-[320px_1fr_380px]">
      <aside className="overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-card to-card/70 shadow-sm">
        <div className="border-b border-border bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 px-3 py-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gradient-tri">
            Item Codes
          </h2>
        </div>
        <ItemCatalog onPick={(item) => addCode(item.code, "1")} />
      </aside>

      <main className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border bg-gradient-to-r from-primary/5 via-transparent to-accent/5 px-4 py-3">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label className="text-xs uppercase text-muted-foreground">Item code</Label>
              <Input
                ref={codeRef} value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addCode(); }}
                placeholder="Type code & press Enter (e.g. 101)"
                className="h-11 font-mono text-base"
              />
            </div>
            <div className="w-24">
              <Label className="text-xs uppercase text-muted-foreground">Qty</Label>
              <Input
                value={qty} onChange={(e) => setQty(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addCode(); }}
                className="h-11 text-center font-mono text-base"
              />
            </div>
            <Button onClick={() => addCode()} className="h-11 gradient-tri border-0 text-white shadow-glow transition-transform hover:scale-105">
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>
          </div>
          {previewItem && isWeighted(previewItem.unit) && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Quick {previewItem.unit}:</span>
              {QUICK_QTY.map((q) => (
                <Button key={q} size="sm" variant="secondary" className="h-7 px-2 text-xs transition-transform hover:scale-110"
                  onClick={() => addCode(previewItem.code, q.toString())}>
                  {q === 1 ? "1" : q === 0.25 ? "¼" : q === 0.5 ? "½" : "¾"} {previewItem.unit}
                </Button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center">
              <div className="px-6">
                <ReceiptIcon className="animate-float mx-auto h-12 w-12 text-muted-foreground/40" />
                <p className="mt-3 text-sm text-muted-foreground">
                  No items yet. Type a code or pick from the left.
                </p>
              </div>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background/95 text-xs uppercase text-muted-foreground backdrop-blur">
                <tr className="border-b border-border">
                  <th className="px-4 py-2 text-left">Code</th>
                  <th className="px-2 py-2 text-left">Item</th>
                  <th className="px-2 py-2 text-center">Qty</th>
                  <th className="px-2 py-2 text-right">MRP</th>
                  <th className="px-2 py-2 text-right">Rate</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {cart.map((l) => {
                  const mrp = l.mrp ?? l.price;
                  const saved = mrp > l.price;
                  return (
                    <tr key={l.code} className="border-b border-border/60 transition-colors hover:bg-gradient-to-r hover:from-primary/5 hover:to-accent/5">
                      <td className="px-4 py-2 font-mono text-xs font-bold text-primary">{l.code}</td>
                      <td className="px-2 py-2">
                        <div className="font-medium">{l.name}</div>
                        <div className="text-xs text-muted-foreground">per {l.unit}</div>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center justify-center gap-1">
                          <Button size="icon" variant="ghost" className="h-6 w-6"
                            onClick={() => updateQty(l.code, l.qty - (isWeighted(l.unit) ? 0.25 : 1))}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-12 text-center font-mono text-sm">
                            {l.qty}<span className="text-xs text-muted-foreground">{l.unit}</span>
                          </span>
                          <Button size="icon" variant="ghost" className="h-6 w-6"
                            onClick={() => updateQty(l.code, l.qty + (isWeighted(l.unit) ? 0.25 : 1))}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-right font-mono text-xs">
                        <span className={saved ? "line-through text-muted-foreground" : ""}>
                          {formatMoney(mrp)}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-right font-mono">{formatMoney(l.price)}</td>
                      <td className="px-4 py-2 text-right font-mono font-semibold">
                        {formatMoney(l.qty * l.price)}
                      </td>
                      <td className="px-2">
                        <Button size="icon" variant="ghost" className="h-7 w-7"
                          onClick={() => remove(l.code)}>
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>

      <aside className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm lg:max-h-[calc(100vh-9rem)]">
        <div className="border-b border-border bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 px-4 py-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wide text-gradient-tri">
              Bill Summary
            </h2>
            <KeyboardShortcutsHelp />
          </div>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            {invoice} {committed && <span className="ml-1 text-green-600">• saved</span>}
            {saving && <span className="ml-1 text-yellow-600">• saving...</span>}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-2 border-b border-border px-4 py-3">
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground">Customer</Label>
              <div className="relative">
                <User className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <CustomerSelect
                  value={customer}
                  onChange={setCustomer}
                  placeholder="Customer (walk-in)"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] uppercase text-muted-foreground">Cashier</Label>
                <Input
                  value={cashier}
                  onChange={(e) => setCashier(e.target.value)}
                  placeholder="Admin"
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-[10px] uppercase text-muted-foreground">Sale type</Label>
                <Select value={saleType} onValueChange={(v) => setSaleType(v as SaleType)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Card">Card</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="Credit">Credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground">Discount (₹)</Label>
              <div className="relative">
                <BadgeIndianRupee className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  inputMode="decimal"
                  value={discountInput}
                  onChange={(e) => setDiscountInput(e.target.value)}
                  placeholder="0"
                  className="h-9 pl-8 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2 px-4 py-4 text-sm">
            <Row label="Items" value={cart.length.toString()} />
            <Row label="Units" value={cart.reduce((s, l) => s + l.qty, 0).toFixed(2)} />
            <Row label="MRP total" value={formatMoney(mrpTotal)} />
            <div className="border-t border-border pt-2" />
            <Row label="Subtotal" value={formatMoney(subtotal)} />
            <Row label="Discount" value={`- ${formatMoney(discount)}`} />
            <Row label={`GST (${shop.taxPercent}%)`} value={formatMoney(tax)} />
            <Row label="Est. profit" value={formatMoney(profit)} />
            <div className="border-t border-border pt-2" />
            <div className="flex items-end justify-between">
              <span className="text-sm uppercase text-muted-foreground">Total</span>
              <span className="font-mono text-3xl font-bold tabular-nums text-gradient-tri">
                {formatMoney(total)}
              </span>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 z-10 space-y-2 border-t border-border bg-gradient-to-b from-muted/30 to-muted/10 p-3 backdrop-blur">
          <Button
            className="h-12 w-full gradient-tri border-0 text-base font-bold text-white shadow-glow transition-transform hover:scale-[1.02]"
            disabled={cart.length === 0 || saving}
            onClick={openPreview}
          >
            {saving ? "Saving..." : <><Eye className="mr-2 h-5 w-5" /> Preview & Print</>}
          </Button>
          <div className="grid grid-cols-3 gap-2">
            <Button size="sm" variant="secondary" disabled={cart.length === 0 || saving} onClick={doPrint} className="transition-transform hover:scale-105">
              <Printer className="mr-1 h-4 w-4" /> Print
            </Button>
            <Button size="sm" variant="secondary" disabled={cart.length === 0 || saving} onClick={onDownloadPDF} className="transition-transform hover:scale-105">
              <FileText className="mr-1 h-4 w-4" /> PDF
            </Button>
            <Button size="sm" variant="secondary" disabled={cart.length === 0 || saving} onClick={onDownloadHTML} className="transition-transform hover:scale-105">
              <Download className="mr-1 h-4 w-4" /> HTML
            </Button>
          </div>
          <Button variant="outline" size="sm" className="w-full" disabled={cart.length === 0 || saving} onClick={clear}>
            <Trash2 className="mr-2 h-4 w-4" /> {committed ? "New Bill" : "Clear Bill"}
          </Button>
        </div>

        <div aria-hidden className="pointer-events-none fixed left-[-10000px] top-0 opacity-0">
          {cart.length > 0 && (
            <Receipt shop={shop} cart={cart} invoiceNo={invoice} date={new Date()}
              customer={customer} cashier={cashier} saleType={saleType} discount={discount} />
          )}
        </div>

        <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
          <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-gradient-tri">Confirm & Print Receipt</DialogTitle>
            </DialogHeader>
            <div className="rounded-xl border border-dashed border-border bg-muted/20 p-2">
              <Receipt shop={shop} cart={cart} invoiceNo={invoice} date={new Date()}
                customer={customer} cashier={cashier} saleType={saleType} discount={discount} />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Button onClick={doPrint} className="gradient-tri border-0 text-white" disabled={saving}>
                <Printer className="mr-1 h-4 w-4" /> Print
              </Button>
              <Button variant="secondary" onClick={onDownloadPDF} disabled={saving}>
                <FileText className="mr-1 h-4 w-4" /> PDF
              </Button>
              <Button variant="secondary" onClick={onDownloadHTML} disabled={saving}>
                <Download className="mr-1 h-4 w-4" /> HTML
              </Button>
              <Button variant="outline"
                onClick={() => { setShowReceipt(false); clear(); toast.success("Bill completed"); }}>
                New Bill
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </aside>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}

// ShopSettingsDialog
export function ShopSettingsDialog() {
  const { shop, update } = useShop();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(shop);
  const [saving, setSaving] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setDraft(shop);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="transition-all hover:border-primary hover:bg-primary/10 hover:text-primary">
          <Settings className="mr-2 h-4 w-4" /> Shop Settings
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Shop Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Shop name</Label>
            <Input 
              value={draft.name} 
              onChange={(e) => setDraft({ ...draft, name: e.target.value })} 
            />
          </div>
          <div>
            <Label>Address</Label>
            <Input 
              value={draft.address} 
              onChange={(e) => setDraft({ ...draft, address: e.target.value })} 
            />
          </div>
          <div>
            <Label>Phone</Label>
            <Input 
              value={draft.phone} 
              onChange={(e) => setDraft({ ...draft, phone: e.target.value })} 
            />
          </div>
          <div>
            <Label>Tax %</Label>
            <Input
              type="number"
              value={draft.taxPercent}
              onChange={(e) => setDraft({ ...draft, taxPercent: parseFloat(e.target.value) || 0 })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={async () => {
              setSaving(true);
              try {
                await update(draft);
                toast.success("Settings saved to Firebase!");
                setOpen(false);
              } catch (error) {
                console.error("Error saving settings:", error);
                toast.error("Failed to save settings");
              } finally {
                setSaving(false);
              }
            }}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}