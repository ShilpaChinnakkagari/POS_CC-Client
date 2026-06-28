// src/context/FirebaseContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth } from '../lib/firebase';
import { onAuthStateChanged, User, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from 'firebase/auth';
import { FirestoreService } from '../lib/firestore';
import { Item, Sale, Expense, StockMovement, ShopInfo } from '../lib/store';

interface FirebaseContextType {
  user: User | null;
  loading: boolean;
  items: any[];
  sales: any[];
  expenses: any[];
  movements: any[];
  shop: ShopInfo;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  register: (email: string, password: string) => Promise<User>;
  addItem: (data: any) => Promise<any>;
  updateItem: (id: string, data: any) => Promise<any>;
  deleteItem: (id: string) => Promise<any>;
  addSale: (data: any) => Promise<any>;
  addExpense: (data: any) => Promise<any>;
  removeExpense: (id: string) => Promise<any>;
  addMovement: (data: any) => Promise<any>;
  updateShop: (data: ShopInfo) => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export const FirebaseProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [shop, setShop] = useState<ShopInfo>({ 
    name: 'FreshMart', 
    address: '12 Market Street, City', 
    phone: '+91 98765 43210', 
    taxPercent: 5 
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const loadShop = async () => {
      try {
        const data = await FirestoreService.getAll('shop');
        if (data.length > 0) {
          setShop(data[0] as ShopInfo);
        }
      } catch (error) {
        console.error('Error loading shop:', error);
      }
    };
    if (user) loadShop();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    console.log('🔥 Listening to collections...');

    const unsubItems = FirestoreService.listen('items', (data) => {
      console.log('📦 Items updated:', data.length);
      setItems(data);
    });

    const unsubSales = FirestoreService.listen('sales', (data) => {
      console.log('💰 Sales updated:', data.length);
      setSales(data);
    });

    const unsubExpenses = FirestoreService.listen('expenses', (data) => {
      setExpenses(data);
    });

    const unsubMovements = FirestoreService.listen('stockMovements', (data) => {
      setMovements(data);
    });

    return () => {
      unsubItems();
      unsubSales();
      unsubExpenses();
      unsubMovements();
    };
  }, [user]);

  const login = async (email: string, password: string) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  };

  const logout = async () => {
    await signOut(auth);
  };

  const register = async (email: string, password: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  };

  const addItem = async (data: any) => {
    return await FirestoreService.add('items', data);
  };

  const updateItem = async (id: string, data: any) => {
    return await FirestoreService.update('items', id, data);
  };

  const deleteItem = async (id: string) => {
    return await FirestoreService.delete('items', id);
  };

  // ✅ FIXED: Remove undefined values before saving
  const addSale = async (data: any) => {
    console.log('📝 Saving sale to Firebase:', data);
    
    // ✅ Remove any undefined values
    const cleanData: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && value !== null) {
        cleanData[key] = value;
      }
    }
    
    const saleData = { 
      ...cleanData, 
      userId: user?.uid || 'unknown',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    console.log('📝 Clean sale data:', saleData);
    const result = await FirestoreService.add('sales', saleData);
    console.log('✅ Sale saved successfully:', result);
    return result;
  };

  const addExpense = async (data: any) => {
    return await FirestoreService.add('expenses', { ...data, userId: user?.uid });
  };

  const removeExpense = async (id: string) => {
    return await FirestoreService.delete('expenses', id);
  };

  const addMovement = async (data: any) => {
    return await FirestoreService.add('stockMovements', data);
  };

  const updateShop = async (data: ShopInfo) => {
    const shopData = await FirestoreService.getAll('shop');
    if (shopData.length > 0) {
      await FirestoreService.update('shop', shopData[0].id, data);
    } else {
      await FirestoreService.add('shop', data);
    }
    setShop(data);
  };

  return (
    <FirebaseContext.Provider value={{
      user,
      loading,
      items,
      sales,
      expenses,
      movements,
      shop,
      login,
      logout,
      register,
      addItem,
      updateItem,
      deleteItem,
      addSale,
      addExpense,
      removeExpense,
      addMovement,
      updateShop
    }}>
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (!context) {
    throw new Error('useFirebase must be used within FirebaseProvider');
  }
  return context;
};