// src/components/ui/KeyboardShortcutsHelp.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";

interface Shortcut {
  keys: string;
  description: string;
}

const shortcuts: Shortcut[] = [
  { keys: "Alt + N", description: "New Bill" },
  { keys: "Alt + S", description: "Save & Print Bill" },
  { keys: "Alt + P", description: "Print Receipt" },
  { keys: "Ctrl + F", description: "Focus Item Code" },
  { keys: "Ctrl + Shift + F", description: "Focus Customer Field" },
  { keys: "Alt + V", description: "Preview Bill" },
  { keys: "Alt + F", description: "Search Items" },
  { keys: "Alt + C", description: "Clear Cart" },
  { keys: "Ctrl + Delete", description: "Clear Cart" },
  { keys: "Esc", description: "Cancel / Clear" },
  { keys: "Enter", description: "Add Item to Cart" },
];

export function KeyboardShortcutsHelp() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-muted-foreground hover:text-foreground"
        >
          <Keyboard className="h-4 w-4" />
          <span className="hidden sm:inline">Shortcuts</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>⌨️ Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="space-y-1">
          {shortcuts.map((shortcut, index) => (
            <div
              key={index}
              className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-muted/50"
            >
              <span className="text-sm text-muted-foreground">
                {shortcut.description}
              </span>
              <kbd className="rounded bg-muted px-2 py-1 font-mono text-xs font-semibold">
                {shortcut.keys}
              </kbd>
            </div>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Shortcuts work even when typing in input fields
        </p>
      </DialogContent>
    </Dialog>
  );
}