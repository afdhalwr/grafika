'use client';

import { onAuthStateChanged, type User } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { firebaseAuth, firebaseReady } from '@/lib/firebase';

/** undefined = masih memeriksa, null = belum masuk. */
type AuthState = { user: User | null | undefined; configured: boolean };

const AuthContext = createContext<AuthState>({ user: undefined, configured: firebaseReady });

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(firebaseReady ? undefined : null);

  useEffect(() => {
    if (!firebaseReady) return;
    return onAuthStateChanged(firebaseAuth(), setUser);
  }, []);

  return <AuthContext.Provider value={{ user, configured: firebaseReady }}>{children}</AuthContext.Provider>;
}
