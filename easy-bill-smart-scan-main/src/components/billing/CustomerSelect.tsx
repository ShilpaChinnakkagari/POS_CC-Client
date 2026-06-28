// src/components/billing/CustomerSelect.tsx
import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Search, User, X, Plus } from "lucide-react";
import { toast } from "sonner";

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
}

interface CustomerSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function CustomerSelect({ value, onChange, placeholder = "Customer" }: CustomerSelectProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load customers from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("customers");
    if (saved) {
      try {
        setCustomers(JSON.parse(saved));
      } catch (e) {
        setCustomers([]);
      }
    }
  }, []);

  // Filter customers based on search
  useEffect(() => {
    if (search.trim() === "") {
      setFilteredCustomers(customers.slice(0, 10));
    } else {
      const filtered = customers.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search) ||
        c.email.toLowerCase().includes(search.toLowerCase())
      );
      setFilteredCustomers(filtered.slice(0, 10));
    }
  }, [search, customers]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (customer: Customer) => {
    onChange(customer.name);
    setSearch("");
    setIsOpen(false);
  };

  const clearSelection = () => {
    onChange("");
    setSearch("");
  };

  // Quick add customer if not found
  const handleAddCustomer = () => {
    if (!search.trim()) {
      toast.error("Please enter a customer name");
      return;
    }
    
    // Check if customer already exists
    const exists = customers.find(c => 
      c.name.toLowerCase() === search.toLowerCase() || 
      c.phone === search
    );
    
    if (exists) {
      handleSelect(exists);
      return;
    }

    // Check if it's a phone number
    const isPhone = /^[0-9]{10}$/.test(search);
    
    const newCustomer: Customer = {
      id: "CUST-" + Date.now(),
      name: search,
      phone: isPhone ? search : "",
      email: "",
      address: "",
    };

    const updatedCustomers = [...customers, newCustomer];
    localStorage.setItem("customers", JSON.stringify(updatedCustomers));
    setCustomers(updatedCustomers);
    onChange(newCustomer.name);
    setSearch("");
    setIsOpen(false);
    toast.success(`Customer "${newCustomer.name}" added!`);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={isOpen ? search : (value && value !== "Customer" ? value : "")}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
            if (e.target.value === "") {
              onChange("Customer");
            }
          }}
          onFocus={() => {
            setIsOpen(true);
            if (value === "Customer") {
              setSearch("");
            }
          }}
          placeholder={placeholder}
          className="h-9 pl-8 pr-8 text-sm"
        />
        {value && value !== "Customer" && !isOpen && (
          <button
            onClick={clearSelection}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-card shadow-lg max-h-60 overflow-y-auto">
          {filteredCustomers.length === 0 && (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              {search.trim() ? (
                <button
                  onClick={handleAddCustomer}
                  className="flex w-full items-center gap-2 text-primary hover:underline"
                >
                  <Plus className="h-4 w-4" />
                  Add "{search}" as customer
                </button>
              ) : (
                "Type to search customers..."
              )}
            </div>
          )}
          {filteredCustomers.map((customer) => (
            <button
              key={customer.id}
              onClick={() => handleSelect(customer)}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
            >
              <User className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <div className="font-medium">{customer.name}</div>
                <div className="text-xs text-muted-foreground">
                  {customer.phone || "No phone"}
                  {customer.email && ` · ${customer.email}`}
                </div>
              </div>
            </button>
          ))}
          {filteredCustomers.length > 0 && search.trim() && (
            <div className="border-t border-border px-3 py-1.5">
              <button
                onClick={handleAddCustomer}
                className="flex w-full items-center gap-2 text-sm text-primary hover:underline"
              >
                <Plus className="h-4 w-4" />
                Add "{search}" as new customer
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}