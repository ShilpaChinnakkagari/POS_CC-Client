import { useMemo, useState } from "react";
import { Item, formatMoney, useItems } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

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
              {list.map((i) => (
                <li key={i.code}>
                  <button
                    onClick={() => onPick(i)}
                    className="group flex w-full items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-left transition hover:border-primary/40 hover:bg-accent/40"
                  >
                    <div className="flex items-center gap-3">
                      <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-xs font-bold text-primary">
                        {i.code}
                      </span>
                      <div>
                        <div className="text-sm font-medium leading-tight">{i.name}</div>
                        <div className="text-xs text-muted-foreground">per {i.unit}</div>
                      </div>
                    </div>
                    <span className="font-mono text-sm font-semibold">{formatMoney(i.price)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
