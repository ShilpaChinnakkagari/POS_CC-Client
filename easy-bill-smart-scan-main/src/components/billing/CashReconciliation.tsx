// src/components/billing/CashReconciliation.tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSales, formatMoney } from "@/lib/store";
import { DollarSign, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

interface CashRecord {
  id: string;
  date: string;
  openingCash: number;
  cashSales: number;
  cardSales: number;
  upiSales: number;
  totalSales: number;
  expectedCash: number;
  actualCash: number;
  difference: number;
  status: "balanced" | "short" | "excess";
  notes: string;
}

export function CashReconciliationDialog() {
  const { sales } = useSales();
  const [open, setOpen] = useState(false);
  const [records, setRecords] = useState<CashRecord[]>([]);
  const [openingCash, setOpeningCash] = useState("0");
  const [actualCash, setActualCash] = useState("0");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [todayRecord, setTodayRecord] = useState<CashRecord | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  // Load cash records from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("cashRecords");
    if (saved) {
      try {
        setRecords(JSON.parse(saved));
      } catch (e) {
        setRecords([]);
      }
    }
  }, []);

  // Save records
  const saveRecords = (newRecords: CashRecord[]) => {
    localStorage.setItem("cashRecords", JSON.stringify(newRecords));
    setRecords(newRecords);
  };

  // Calculate today's sales
  const todaySales = sales.filter((s) => s.date?.slice(0, 10) === today);
  const cashSales = todaySales.filter((s) => s.saleType === "Cash");
  const cardSales = todaySales.filter((s) => s.saleType === "Card");
  const upiSales = todaySales.filter((s) => s.saleType === "UPI");
  
  const totalCashSales = cashSales.reduce((sum, s) => sum + s.total, 0);
  const totalCardSales = cardSales.reduce((sum, s) => sum + s.total, 0);
  const totalUpiSales = upiSales.reduce((sum, s) => sum + s.total, 0);
  const totalSales = todaySales.reduce((sum, s) => sum + s.total, 0);

  // Check if today has a record
  useEffect(() => {
    const existing = records.find((r) => r.date === today);
    setTodayRecord(existing || null);
    if (existing) {
      setOpeningCash(existing.openingCash.toString());
      setActualCash(existing.actualCash.toString());
      setNotes(existing.notes || "");
    } else {
      setOpeningCash("0");
      setActualCash("0");
      setNotes("");
    }
  }, [records, today]);

  const handleReconcile = () => {
    const opening = parseFloat(openingCash) || 0;
    const actual = parseFloat(actualCash) || 0;
    const expected = opening + totalCashSales;
    const difference = actual - expected;

    const newRecord: CashRecord = {
      id: "CR-" + Date.now(),
      date: today,
      openingCash: opening,
      cashSales: totalCashSales,
      cardSales: totalCardSales,
      upiSales: totalUpiSales,
      totalSales: totalSales,
      expectedCash: expected,
      actualCash: actual,
      difference: difference,
      status: Math.abs(difference) < 1 ? "balanced" : difference > 0 ? "excess" : "short",
      notes: notes,
    };

    const updatedRecords = records.filter((r) => r.date !== today);
    updatedRecords.push(newRecord);
    saveRecords(updatedRecords);
    setTodayRecord(newRecord);
    toast.success("Cash reconciliation saved!");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "balanced": return "text-green-600";
      case "excess": return "text-blue-600";
      case "short": return "text-red-600";
      default: return "";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "balanced": return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "excess": return <DollarSign className="h-4 w-4 text-blue-600" />;
      case "short": return <XCircle className="h-4 w-4 text-red-600" />;
      default: return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "balanced": return "Balanced ✅";
      case "excess": return "Excess (+)";
      case "short": return "Short (-)";
      default: return "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-blue-300 text-blue-600 hover:bg-blue-50 hover:text-blue-700">
          <DollarSign className="h-4 w-4" /> Cash Reconciliation
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Daily Cash Reconciliation</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString("en-IN", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Today's Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-lg border border-border bg-card p-3 text-center">
              <p className="text-xs text-muted-foreground">Total Sales</p>
              <p className="text-xl font-bold text-primary">{formatMoney(totalSales)}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3 text-center">
              <p className="text-xs text-muted-foreground">Cash Sales</p>
              <p className="text-xl font-bold text-green-600">{formatMoney(totalCashSales)}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3 text-center">
              <p className="text-xs text-muted-foreground">Card Sales</p>
              <p className="text-xl font-bold text-blue-600">{formatMoney(totalCardSales)}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3 text-center">
              <p className="text-xs text-muted-foreground">UPI Sales</p>
              <p className="text-xl font-bold text-purple-600">{formatMoney(totalUpiSales)}</p>
            </div>
          </div>

          {/* Reconciliation Form */}
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <h4 className="font-medium mb-3">Cash Reconciliation</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Opening Cash (₹)</Label>
                <Input
                  type="number"
                  value={openingCash}
                  onChange={(e) => setOpeningCash(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Actual Cash in Drawer (₹)</Label>
                <Input
                  type="number"
                  value={actualCash}
                  onChange={(e) => setActualCash(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="col-span-2">
                <Label>Notes</Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any notes about discrepancies..."
                />
              </div>
            </div>

            {todayRecord && (
              <div className="mt-3 p-3 rounded-lg border border-border bg-card">
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Expected Cash:</span>
                    <span className="font-mono ml-2">{formatMoney(todayRecord.expectedCash)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Actual Cash:</span>
                    <span className="font-mono ml-2">{formatMoney(todayRecord.actualCash)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Status:</span>
                    <span className={`font-medium flex items-center gap-1 ${getStatusColor(todayRecord.status)}`}>
                      {getStatusIcon(todayRecord.status)}
                      {getStatusLabel(todayRecord.status)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <Button
              onClick={handleReconcile}
              className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white"
              disabled={loading}
            >
              {loading ? "Saving..." : todayRecord ? "Update Reconciliation" : "Save Reconciliation"}
            </Button>
          </div>

          {/* History */}
          {records.length > 0 && (
            <div className="rounded-lg border border-border">
              <div className="border-b border-border bg-muted/30 px-4 py-2 text-sm font-semibold">
                Reconciliation History
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Opening</TableHead>
                    <TableHead className="text-right">Cash Sales</TableHead>
                    <TableHead className="text-right">Expected</TableHead>
                    <TableHead className="text-right">Actual</TableHead>
                    <TableHead className="text-right">Diff</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.slice().reverse().map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{new Date(r.date).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right font-mono">{formatMoney(r.openingCash)}</TableCell>
                      <TableCell className="text-right font-mono">{formatMoney(r.cashSales)}</TableCell>
                      <TableCell className="text-right font-mono">{formatMoney(r.expectedCash)}</TableCell>
                      <TableCell className="text-right font-mono">{formatMoney(r.actualCash)}</TableCell>
                      <TableCell className={`text-right font-mono ${getStatusColor(r.status)}`}>
                        {r.difference > 0 ? "+" : ""}{r.difference.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs flex items-center gap-1 ${getStatusColor(r.status)}`}>
                          {getStatusIcon(r.status)}
                          {getStatusLabel(r.status)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}