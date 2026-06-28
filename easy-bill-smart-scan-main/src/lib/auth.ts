// src/lib/auth.ts
import { useFirebase } from '@/context/FirebaseContext';
import { useEffect, useState } from 'react';

export const DEFAULT_EMAIL = "admin@mart.com";
export const DEFAULT_PAD = "admin123";

export function useAuth() {
  const { user, login: firebaseLogin, logout: firebaseLogout, loading, register: firebaseRegister } = useFirebase();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    setAuthed(!!user);
  }, [user]);

  const login = async (email: string, password: string) => {
    try {
      await firebaseLogin(email, password);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const register = async (email: string, password: string) => {
    return await firebaseRegister(email, password);
  };

  const logout = async () => {
    await firebaseLogout();
  };

  return { authed, login, logout, loading, register };
}