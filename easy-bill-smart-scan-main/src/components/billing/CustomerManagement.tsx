// src/components/billing/CustomerManagement.tsx
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
import { FirestoreService } from "@/lib/firestore";
import { useFirebase } from "@/context/FirebaseContext";
import { Users, Plus, Search, Phone, Mail, User, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  createdAt: string;
  totalSpent: number;
  totalOrders: number;
}

export function CustomerManagement() {
  const { sales } = useSales();
  const { user } = useFirebase();
  const [open, setOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
  });

  // ✅ Load customers from Firebase
  const loadCustomers = async () => {
    if (!user) {
      console.log("⚠️ No user logged in");
      return;
    }
    
    setLoading(true);
    try {
      const data = await FirestoreService.getAll('customers');
      console.log("📦 Customers from Firebase:", data);
      
      // Map and calculate totals
      const mappedCustomers = data.map((doc: any) => {
        const customerSales = sales.filter(s => 
          s.customer?.toLowerCase() === doc.name?.toLowerCase() ||
          s.customer?.toLowerCase() === doc.phone
        );
        const totalSpent = customerSales.reduce((sum, s) => sum + (s.total || 0), 0);
        return {
          ...doc,
          id: doc.id || doc.phone,
          totalSpent: totalSpent,
          totalOrders: customerSales.length,
        };
      });
      setCustomers(mappedCustomers);
    } catch (error) {
      console.error("❌ Error loading customers:", error);
      toast.error("Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Save customer to Firebase
  const addCustomerToFirebase = async (customer: Customer) => {
    if (!user) {
      toast.error("Please login first");
      return;
    }
    
    try {
      // Use phone as document ID to avoid duplicates
      const result = await FirestoreService.addWithId('customers', customer.phone, {
        name: customer.name,
        phone: customer.phone,
        email: customer.email || "",
        address: customer.address || "",
        createdAt: new Date().toISOString(),
      });
      console.log("✅ Customer saved to Firebase:", result);
      return result;
    } catch (error) {
      console.error("❌ Error saving customer:", error);
      throw error;
    }
  };

  // Load customers when dialog opens
  useEffect(() => {
    if (open && user) {
      loadCustomers();
    }
  }, [open, user, sales]);

  // Add customer
  const addCustomer = async () => {
    if (!form.name || !form.phone) {
      toast.error("Name and Phone are required");
      return;
    }

    // Check if customer exists locally
    const existing = customers.find(c => c.phone === form.phone);
    if (existing) {
      toast.error("Customer with this phone already exists");
      return;
    }

    setLoading(true);
    try {
      const newCustomer: Customer = {
        id: "CUST-" + Date.now(),
        name: form.name,
        phone: form.phone,
        email: form.email || "",
        address: form.address || "",
        createdAt: new Date().toISOString(),
        totalSpent: 0,
        totalOrders: 0,
      };

      // ✅ Save to Firebase
      await addCustomerToFirebase(newCustomer);
      
      // Refresh list
      await loadCustomers();
      setForm({ name: "", phone: "", email: "", address: "" });
      toast.success(`Customer ${form.name} added to Firebase!`);
    } catch (error) {
      console.error("❌ Error adding customer:", error);
      toast.error("Failed to add customer");
    } finally {
      setLoading(false);
    }
  };

  // Filter customers
  const filteredCustomers = customers.filter((c) =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  // View customer details
  const viewCustomer = (customer: Customer) => {
    const customerSales = sales.filter(s => 
      s.customer?.toLowerCase() === customer.name?.toLowerCase() ||
      s.customer?.toLowerCase() === customer.phone
    );
    const totalSpent = customerSales.reduce((sum, s) => sum + (s.total || 0), 0);
    
    setSelectedCustomer({
      ...customer,
      totalSpent: totalSpent,
      totalOrders: customerSales.length,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-purple-300 text-purple-600 hover:bg-purple-50 hover:text-purple-700">
          <Users className="h-4 w-4" /> Customers
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Customer Management</DialogTitle>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {customers.length} customers registered {user ? "in Firebase" : "(offline)"}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadCustomers}
              className="gap-1"
              disabled={loading}
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} /> 
              {loading ? "Loading..." : "Refresh"}
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add Customer Form */}
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Plus className="h-4 w-4" /> Add New Customer
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Customer name"
                />
              </div>
              <div>
                <Label>Phone *</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="Phone number"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="Email (optional)"
                />
              </div>
              <div>
                <Label>Address</Label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Address (optional)"
                />
              </div>
            </div>
            <Button 
              onClick={addCustomer} 
              className="mt-3 bg-purple-600 hover:bg-purple-700 text-white"
              disabled={loading}
            >
              {loading ? "Saving..." : "Add Customer"}
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Customer List */}
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Total Spent</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      {loading ? "Loading..." : "No customers found. Add your first customer!"}
                    </TableCell>
                  </TableRow>
                )}
                {filteredCustomers.map((c) => (
                  <TableRow key={c.id || c.phone}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.phone}</TableCell>
                    <TableCell>{c.email || "—"}</TableCell>
                    <TableCell className="text-right">{c.totalOrders || 0}</TableCell>
                    <TableCell className="text-right font-mono">{formatMoney(c.totalSpent || 0)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => viewCustomer(c)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Customer Details */}
          {selectedCustomer && (
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <div className="flex justify-between items-start flex-wrap gap-2">
                <div>
                  <h4 className="font-bold text-lg">{selectedCustomer.name}</h4>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-1">
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {selectedCustomer.phone}</span>
                    {selectedCustomer.email && (
                      <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {selectedCustomer.email}</span>
                    )}
                    {selectedCustomer.address && (
                      <span className="flex items-center gap-1"><User className="h-3 w-3" /> {selectedCustomer.address}</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Total Orders</div>
                  <div className="text-xl font-bold">{selectedCustomer.totalOrders}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Total Spent</div>
                  <div className="text-xl font-bold text-green-600">{formatMoney(selectedCustomer.totalSpent)}</div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedCustomer(null)}
                >
                  Close
                </Button>
              </div>
              {selectedCustomer.totalOrders === 0 && (
                <p className="text-sm text-muted-foreground mt-2">No purchases yet. Customer will show orders after billing.</p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}