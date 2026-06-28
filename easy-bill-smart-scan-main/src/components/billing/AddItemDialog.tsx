// src/components/billing/AddItemDialog.tsx
import { useState } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Item, Unit, useItems } from "@/lib/store";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export function AddItemDialog() {
  const { addItem } = useItems();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<Partial<Item>>({
    code: "",
    name: "",
    category: "",
    unit: "pcs",
    price: 0,
    cost: 0,
    stock: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!form.code || !form.name || !form.category) {
        toast.error("Code, Name and Category are required");
        setLoading(false);
        return;
      }

      const newItem: Item = {
        code: form.code,
        name: form.name,
        category: form.category,
        unit: form.unit as Unit,
        price: form.price || 0,
        cost: form.cost || 0,
        stock: form.stock || 0,
      };

      await addItem(newItem);
      toast.success(`Added ${form.name}`);
      setOpen(false);
      setForm({
        code: "",
        name: "",
        category: "",
        unit: "pcs",
        price: 0,
        cost: 0,
        stock: 0,
      });
    } catch (error) {
      console.error("Error adding item:", error);
      toast.error("Failed to add item");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 gradient-tri border-0 text-white shadow-glow transition-transform hover:scale-105">
          <Plus className="h-4 w-4" /> Add Item
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Code *</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="e.g. 601"
                required
              />
            </div>
            <div>
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Item name"
                required
              />
            </div>
          </div>

          <div>
            <Label>Category *</Label>
            <Input
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="e.g. Beverages"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Unit</Label>
              <Select
                value={form.unit}
                onValueChange={(v) => setForm({ ...form, unit: v as Unit })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pcs">Pieces</SelectItem>
                  <SelectItem value="kg">Kilogram</SelectItem>
                  <SelectItem value="g">Gram</SelectItem>
                  <SelectItem value="litre">Litre</SelectItem>
                  <SelectItem value="ml">Millilitre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Stock</Label>
              <Input
                type="number"
                step="0.01"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Buy Price (₹)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.cost}
                onChange={(e) => setForm({ ...form, cost: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Sell Price (₹)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1 gradient-tri border-0 text-white" disabled={loading}>
              {loading ? "Adding..." : "Add Item"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}