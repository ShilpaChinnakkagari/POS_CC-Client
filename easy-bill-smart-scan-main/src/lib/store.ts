// src/lib/store.ts
import { useFirebase } from '@/context/FirebaseContext';
import { useEffect, useState, useCallback, useRef } from 'react';

export type Unit = "pcs" | "kg" | "g" | "litre" | "ml";

export interface Item {
  code: string;
  name: string;
  category: string;
  unit: Unit;
  price: number;
  cost?: number;
  mrp?: number;
  stock?: number;
  id?: string;
}

export interface CartLine {
  code: string;
  name: string;
  unit: Unit;
  price: number;
  qty: number;
  cost?: number;
  mrp?: number;
}

export type SaleType = "Cash" | "Card" | "UPI" | "Credit";

export interface Sale {
  invoice: string;
  date: string;
  lines: CartLine[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  profit: number;
  customer?: string;
  cashier?: string;
  saleType?: SaleType;
  id?: string;
}

export interface StockMovement {
  id: string;
  date: string;
  code: string;
  name: string;
  unit: Unit;
  qty: number;
  type: "in" | "out";
  cost?: number;
  note?: string;
}

export interface Expense {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
}

export interface ShopInfo {
  name: string;
  address: string;
  phone: string;
  taxPercent: number;
}

// ✅ FIXED: useItems with proper Firebase integration
export function useItems() {
  const { 
    items: firebaseItems, 
    addItem: firebaseAddItem, 
    updateItem: firebaseUpdateItem, 
    deleteItem: firebaseDeleteItem, 
    user 
  } = useFirebase();
  
  const [items, setItems] = useState<Item[]>([]);
  const addingRef = useRef(false);

  useEffect(() => {
    if (firebaseItems) {
      const mappedItems = firebaseItems.map((doc: any) => ({
        ...doc,
        id: doc.id || doc.code,
      }));
      setItems(mappedItems);
    }
  }, [firebaseItems]);

  const addItem = useCallback(async (item: Item) => {
    if (addingRef.current) {
      console.log('⏳ Already adding an item, please wait...');
      return;
    }

    try {
      addingRef.current = true;
      const existing = items.find(i => i.code === item.code);
      if (existing && existing.id) {
        await firebaseUpdateItem(existing.id, item);
      } else {
        const firebaseCheck = firebaseItems?.find((i: any) => i.code === item.code);
        if (firebaseCheck && firebaseCheck.id) {
          await firebaseUpdateItem(firebaseCheck.id, item);
        } else {
          await firebaseAddItem(item);
        }
      }
    } catch (error) {
      console.error('❌ Error adding item:', error);
      throw error;
    } finally {
      addingRef.current = false;
    }
  }, [items, firebaseItems, firebaseAddItem, firebaseUpdateItem]);

  const removeItem = useCallback(async (code: string) => {
    try {
      const item = items.find(i => i.code === code);
      if (item && item.id) {
        await firebaseDeleteItem(item.id);
      }
    } catch (error) {
      console.error('❌ Error removing item:', error);
      throw error;
    }
  }, [items, firebaseDeleteItem]);

  const findByCode = useCallback((code: string) => {
    return items.find(i => i.code === code);
  }, [items]);

  const adjustStock = useCallback(async (code: string, delta: number) => {
    try {
      const item = items.find(i => i.code === code);
      if (!item || !item.id) return;
      const currentStock = item.stock || 0;
      const newStock = currentStock + delta;
      if (newStock < 0) {
        console.warn(`⚠️ Cannot reduce stock below 0 for ${code}`);
        return;
      }
      const roundedStock = Math.round(newStock * 1000) / 1000;
      await firebaseUpdateItem(item.id, { ...item, stock: roundedStock });
    } catch (error) {
      console.error('❌ Error adjusting stock:', error);
      throw error;
    }
  }, [items, firebaseUpdateItem]);

  return { items, addItem, removeItem, findByCode, adjustStock };
}

// ✅ FIXED: useShop with Firebase
export function useShop() {
  const { shop, updateShop } = useFirebase();
  return { shop, update: updateShop };
}

// ✅ FIXED: useSales with Firebase (real data)
export function useSales() {
  const { sales, addSale } = useFirebase();
  return { sales, addSale };
}

// ✅ FIXED: useStockMovements with Firebase
export function useStockMovements() {
  const { movements, addMovement } = useFirebase();
  return { movements, addMovement };
}

// ✅ FIXED: useExpenses with Firebase
export function useExpenses() {
  const { expenses, addExpense, removeExpense } = useFirebase();
  return { expenses, addExpense, removeExpense };
}

export function formatMoney(n: number) {
  return "₹" + n.toFixed(2);
}

export function unitLabel(u: Unit) {
  return u;
}

export function isWeighted(u: Unit) {
  return u === "kg" || u === "litre";
}