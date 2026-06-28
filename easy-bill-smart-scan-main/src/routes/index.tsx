// src/routes/index.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BillingScreen } from "@/components/billing/BillingScreen";
import { ManageItems } from "@/components/billing/ManageItems";
import { useShop } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { LoginScreen } from "@/components/LoginScreen";
import { StoreIntro } from "@/components/StoreIntro";
import { ReportsTab } from "@/components/billing/ReportsTab";
import { ExpensesTab } from "@/components/billing/ExpensesTab";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScanLine, Package, Settings, BarChart3, Wallet, LogOut, ShoppingBasket } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { KeyboardShortcutsHelp } from "@/components/ui/KeyboardShortcutsHelp";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { authed, logout, loading } = useAuth();
  const { shop } = useShop();
  const [introDone, setIntroDone] = useState(true);
  
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("grocery.intro.v1") !== "done") setIntroDone(false);
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!authed) {
    if (!introDone) {
      return (
        <>
          <StoreIntro onDone={() => { sessionStorage.setItem("grocery.intro.v1", "done"); setIntroDone(true); }} />
          <Toaster richColors position="top-center" />
        </>
      );
    }
    return (
      <>
        <LoginScreen />
        <Toaster richColors position="top-center" />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-card/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3 animate-fade-in">
            <div className="animate-float flex h-11 w-11 items-center justify-center rounded-xl gradient-tri shadow-glow transition-transform duration-300 hover:scale-110 hover:rotate-12">
              <ShoppingBasket className="h-5 w-5 text-white drop-shadow" />
            </div>
            <div>
              <h1 className="text-gradient-tri text-lg font-extrabold leading-tight">
                {shop.name}
              </h1>
              <p className="text-xs text-muted-foreground">Point of Sale & Billing</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <KeyboardShortcutsHelp />
            <ShopSettingsDialog />
            <Button
              variant="outline"
              size="sm"
              onClick={() => { logout(); toast.success("Logged out"); }}
              className="transition-all hover:border-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <Tabs defaultValue="billing" className="mx-auto max-w-[1600px] px-4 py-4">
        <TabsList className="mb-4 h-11 bg-card/60 p-1 shadow-sm backdrop-blur">
          <TabsTrigger value="billing" className="gap-2 transition-all data-[state=active]:gradient-tri data-[state=active]:text-white data-[state=active]:shadow-glow">
            <ScanLine className="h-4 w-4" /> Billing
          </TabsTrigger>
          <TabsTrigger value="items" className="gap-2 transition-all data-[state=active]:gradient-tri data-[state=active]:text-white data-[state=active]:shadow-glow">
            <Package className="h-4 w-4" /> Manage Items
          </TabsTrigger>
          <TabsTrigger value="expenses" className="gap-2 transition-all data-[state=active]:gradient-tri data-[state=active]:text-white data-[state=active]:shadow-glow">
            <Wallet className="h-4 w-4" /> Expenses
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2 transition-all data-[state=active]:gradient-tri data-[state=active]:text-white data-[state=active]:shadow-glow">
            <BarChart3 className="h-4 w-4" /> Reports
          </TabsTrigger>
        </TabsList>
        <TabsContent value="billing" className="animate-fade-in">
          <BillingScreen />
        </TabsContent>
        <TabsContent value="items" className="animate-fade-in">
          <ManageItems />
        </TabsContent>
        <TabsContent value="expenses" className="animate-fade-in">
          <ExpensesTab />
        </TabsContent>
        <TabsContent value="reports" className="animate-fade-in">
          <ReportsTab />
        </TabsContent>
      </Tabs>

      <Toaster richColors position="top-center" />
    </div>
  );
}

function ShopSettingsDialog() {
  const { shop, update } = useShop();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(shop);

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
            <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </div>
          <div>
            <Label>Address</Label>
            <Input value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
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
            onClick={() => {
              update(draft);
              toast.success("Settings saved");
              setOpen(false);
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}