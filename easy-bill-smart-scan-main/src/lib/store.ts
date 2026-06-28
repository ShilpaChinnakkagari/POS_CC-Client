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

  // Update items when Firebase data changes
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
        console.log(`📝 Updating existing item: ${item.code}`);
        await firebaseUpdateItem(existing.id, item);
      } else {
        const firebaseCheck = firebaseItems?.find((i: any) => i.code === item.code);
        if (firebaseCheck && firebaseCheck.id) {
          console.log(`📝 Updating existing item from Firebase: ${item.code}`);
          await firebaseUpdateItem(firebaseCheck.id, item);
        } else {
          console.log(`➕ Adding new item: ${item.code}`);
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
        console.log(`✅ Removed item: ${code}`);
      }
    } catch (error) {
      console.error('❌ Error removing item:', error);
      throw error;
    }
  }, [items, firebaseDeleteItem]);

  const findByCode = useCallback((code: string) => {
    return items.find(i => i.code === code);
  }, [items]);

  // ✅ FIXED: Adjust stock with proper validation
  const adjustStock = useCallback(async (code: string, delta: number) => {
    try {
      const item = items.find(i => i.code === code);
      if (!item) {
        console.error(`❌ Item not found: ${code}`);
        return;
      }

      if (!item.id) {
        console.error(`❌ Item has no ID: ${code}`);
        return;
      }

      const currentStock = item.stock || 0;
      const newStock = currentStock + delta;
      
      // ✅ Prevent negative stock
      if (newStock < 0) {
        console.warn(`⚠️ Cannot reduce stock below 0 for ${code}. Current: ${currentStock}, Requested: ${delta}`);
        return;
      }

      console.log(`📊 Adjusting stock for ${code}: ${currentStock} → ${newStock} (delta: ${delta})`);
      
      // ✅ Round to 3 decimal places
      const roundedStock = Math.round(newStock * 1000) / 1000;
      
      await firebaseUpdateItem(item.id, { 
        ...item, 
        stock: roundedStock 
      });
      
      console.log(`✅ Stock adjusted: ${code}, new stock: ${roundedStock}`);
    } catch (error) {
      console.error('❌ Error adjusting stock:', error);
      throw error;
    }
  }, [items, firebaseUpdateItem]);

  return { items, addItem, removeItem, findByCode, adjustStock };
}

export function useShop() {
  const { shop, updateShop } = useFirebase();
  return { shop, update: updateShop };
}

export function useSales() {
  const { sales, addSale } = useFirebase();
  return { sales, addSale };
}

export function useStockMovements() {
  const { movements, addMovement } = useFirebase();
  return { movements, addMovement };
}

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