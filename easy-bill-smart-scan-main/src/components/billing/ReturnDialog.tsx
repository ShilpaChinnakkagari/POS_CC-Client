// src/components/billing/ReturnDialog.tsx
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useItems, useStockMovements, formatMoney } from "@/lib/store";
import { Search, RefreshCw, CheckSquare, Square } from "lucide-react";
import { toast } from "sonner";

interface ReturnItem {
  code: string;
  name: string;
  qty: number;
  price: number;
  cost: number;
  selected: boolean;
  returnQty: number;
}

interface InvoiceData {
  invoice: string;
  date: string;
  customer: string;
  total: number;
  items: ReturnItem[];
}

export function ReturnDialog() {
  const { items, adjustStock } = useItems();
  const { movements, addMovement } = useStockMovements();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [loading, setLoading] = useState(false);

  // ✅ Get all invoices from stock movements
  const invoices = useMemo(() => {
    const invoiceMap = new Map<string, InvoiceData>();
    
    // Get all "out" movements (sales)
    const outMovements = movements.filter(m => m.type === "out");
    
    outMovements.forEach(m => {
      const invoice = m.note || m.id;
      if (!invoiceMap.has(invoice)) {
        invoiceMap.set(invoice, {
          invoice: invoice,
          date: m.date,
          customer: "Customer",
          total: 0,
          items: [],
        });
      }
      
      const sale = invoiceMap.get(invoice)!;
      const item = items.find(i => i.code === m.code);
      const price = item?.price || 0;
      const cost = item?.cost || 0;
      
      sale.items.push({
        code: m.code,
        name: m.name || item?.name || "Unknown",
        qty: m.qty,
        price: price,
        cost: cost,
        selected: false,
        returnQty: 0,
      });
      sale.total += price * m.qty;
    });
    
    return Array.from(invoiceMap.values());
  }, [movements, items]);

  // Filter invoices by search
  const filteredInvoices = invoices.filter((inv) =>
    inv.invoice.toLowerCase().includes(search.toLowerCase()) ||
    inv.customer.toLowerCase().includes(search.toLowerCase())
  );

  // Select invoice for return
  const selectInvoice = (invoice: InvoiceData) => {
    setSelectedInvoice(invoice);
    const itemsList = invoice.items.map((item) => ({
      ...item,
      selected: false,
      returnQty: 0,
    }));
    setReturnItems(itemsList);
  };

  // Toggle item selection
  const toggleItem = (index: number) => {
    const updated = [...returnItems];
    updated[index].selected = !updated[index].selected;
    if (!updated[index].selected) {
      updated[index].returnQty = 0;
    } else {
      updated[index].returnQty = updated[index].qty;
    }
    setReturnItems(updated);
  };

  // Update return quantity
  const updateReturnQty = (index: number, qty: number) => {
    const updated = [...returnItems];
    const maxQty = updated[index].qty;
    const value = Math.min(Math.max(0, qty), maxQty);
    updated[index].returnQty = value;
    setReturnItems(updated);
  };

  // Process return
  const processReturn = async () => {
    const selectedItems = returnItems.filter((item) => item.selected && item.returnQty > 0);
    if (selectedItems.length === 0) {
      toast.error("Select at least one item to return");
      return;
    }

    setLoading(true);
    try {
      const date = new Date().toISOString();
      let totalRefund = 0;

      for (const item of selectedItems) {
        // Restock inventory
        await adjustStock(item.code, item.returnQty);
        
        // Record stock movement (return = "in")
        await addMovement({
          id: "RETURN-" + Date.now() + "-" + item.code,
          date,
          code: item.code,
          name: item.name,
          unit: "pcs",
          qty: item.returnQty,
          type: "in",
          cost: item.cost,
          note: `Return from ${selectedInvoice.invoice}`,
        });

        totalRefund += item.returnQty * item.price;
      }

      toast.success(`Return processed! Refund: ${formatMoney(totalRefund)}`);
      setOpen(false);
      setSelectedInvoice(null);
      setReturnItems([]);
      setSearch("");
    } catch (error) {
      console.error("Error processing return:", error);
      toast.error("Failed to process return");
    } finally {
      setLoading(false);
    }
  };

  // Calculate total refund
  const totalRefund = returnItems
    .filter((item) => item.selected && item.returnQty > 0)
    .reduce((sum, item) => sum + item.returnQty * item.price, 0);

  const totalItems = returnItems
    .filter((item) => item.selected && item.returnQty > 0)
    .reduce((sum, item) => sum + item.returnQty, 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-orange-300 text-orange-600 hover:bg-orange-50 hover:text-orange-700">
          <RefreshCw className="h-4 w-4" /> Return
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Return / Refund</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {invoices.length} invoices found from stock movements
          </p>
        </DialogHeader>

        {!selectedInvoice ? (
          // Invoice Search View
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by invoice number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                        No invoices found in stock movements.
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredInvoices.map((inv) => (
                    <TableRow key={inv.invoice}>
                      <TableCell className="font-mono">{inv.invoice}</TableCell>
                      <TableCell>{new Date(inv.date).toLocaleDateString()}</TableCell>
                      <TableCell>{inv.items.length}</TableCell>
                      <TableCell className="text-right font-mono">{formatMoney(inv.total)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => selectInvoice(inv)}
                        >
                          Select
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          // Return Items View
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <p className="text-sm font-medium">Invoice: <span className="font-mono">{selectedInvoice.invoice}</span></p>
                <p className="text-sm text-muted-foreground">Items: {selectedInvoice.items.length}</p>
                <p className="text-sm text-muted-foreground">Date: {new Date(selectedInvoice.date).toLocaleDateString()}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedInvoice(null);
                  setReturnItems([]);
                }}
              >
                ← Back
              </Button>
            </div>

            <div className="rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">Select</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Return Qty</TableHead>
                    <TableHead className="text-right">Refund</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returnItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                        No items in this invoice.
                      </TableCell>
                    </TableRow>
                  )}
                  {returnItems.map((item, index) => (
                    <TableRow key={item.code} className={item.selected ? "bg-blue-50/50" : ""}>
                      <TableCell>
                        <button
                          onClick={() => toggleItem(index)}
                          className="text-muted-foreground hover:text-primary"
                          type="button"
                        >
                          {item.selected ? (
                            <CheckSquare className="h-5 w-5 text-primary" />
                          ) : (
                            <Square className="h-5 w-5" />
                          )}
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-muted-foreground">Code: {item.code}</div>
                      </TableCell>
                      <TableCell className="text-right">{item.qty}</TableCell>
                      <TableCell className="text-right font-mono">{formatMoney(item.price)}</TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min="0"
                          max={item.qty}
                          value={item.returnQty}
                          onChange={(e) => updateReturnQty(index, parseInt(e.target.value) || 0)}
                          disabled={!item.selected}
                          className="w-20 text-center"
                        />
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {item.selected && item.returnQty > 0
                          ? formatMoney(item.returnQty * item.price)
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Return Summary */}
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">Items to return</p>
                  <p className="text-lg font-bold">{totalItems}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Refund</p>
                  <p className="text-lg font-bold text-red-600">{formatMoney(totalRefund)}</p>
                </div>
                <Button
                  onClick={processReturn}
                  disabled={loading || totalItems === 0}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {loading ? "Processing..." : `Process Return (${formatMoney(totalRefund)})`}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}