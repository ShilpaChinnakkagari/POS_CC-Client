import { useState } from "react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useItems, useStockMovements } from "@/lib/store";
import { PackagePlus } from "lucide-react";
import { toast } from "sonner";

export function StockInDialog() {
  const { items, findByCode, adjustStock, addItem } = useItems();
  const { addMovement } = useStockMovements();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [qty, setQty] = useState("");
  const [cost, setCost] = useState("");
  const [note, setNote] = useState("");

  const item = findByCode(code);

  const submit = () => {
    if (!item) {
      toast.error("Pick a valid item");
      return;
    }
    const q = parseFloat(qty);
    if (!q || q <= 0) {
      toast.error("Invalid quantity");
      return;
    }
    const c = cost ? parseFloat(cost) : item.cost;
    adjustStock(item.code, q);
    if (c && c !== item.cost) {
      addItem({ ...item, cost: c, stock: (item.stock ?? 0) + q });
    }
    addMovement({
      id: "MV-" + Date.now(),
      date: new Date().toISOString(),
      code: item.code,
      name: item.name,
      unit: item.unit,
      qty: q,
      type: "in",
      cost: c,
      note: note.trim() || undefined,
    });
    toast.success(`Stocked in ${q} ${item.unit} of ${item.name}`);
    setCode(""); setQty(""); setCost(""); setNote("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <PackagePlus className="mr-1 h-4 w-4" /> Stock In
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Record stock in</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Item</Label>
            <Select value={code} onValueChange={setCode}>
              <SelectTrigger><SelectValue placeholder="Choose item" /></SelectTrigger>
              <SelectContent>
                {items.sort((a,b)=>a.name.localeCompare(b.name)).map((i) => (
                  <SelectItem key={i.code} value={i.code}>
                    {i.code} · {i.name} ({i.unit})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Quantity ({item?.unit ?? "unit"})</Label>
            <Input type="number" step="0.001" value={qty}
              onChange={(e) => setQty(e.target.value)} placeholder="0" />
          </div>
          <div>
            <Label>Buy price / unit</Label>
            <Input type="number" step="0.01" value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder={item?.cost?.toString() ?? "0.00"} />
          </div>
          <div className="col-span-2">
            <Label>Note</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="supplier / invoice (optional)" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
