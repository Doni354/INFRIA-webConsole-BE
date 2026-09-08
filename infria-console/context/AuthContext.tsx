"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { User } from "firebase/auth";
import { authService } from "@/services/auth.service";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged(async (u) => {
      setUser(u);
      setLoading(false);
      if (u) {
        // Cache account in localStorage for seeder selector
        try {
          const raw = localStorage.getItem("infria_known_accounts");
          const accounts: Array<{ uid: string; email: string; displayName: string; photoURL?: string }> = raw ? JSON.parse(raw) : [];
          const entry = {
            uid: u.uid,
            email: u.email || "",
            displayName: u.displayName || u.email?.split("@")[0] || "User",
            photoURL: u.photoURL || undefined,
          };
          const existingIdx = accounts.findIndex((a) => a.uid === u.uid);
          if (existingIdx >= 0) {
            accounts[existingIdx] = entry;
          } else {
            accounts.push(entry);
          }
          localStorage.setItem("infria_known_accounts", JSON.stringify(accounts));
        } catch {
          // ignore localStorage error
        }

        // Try writing to Firestore if rules allow
        try {
          const { doc, setDoc } = await import("firebase/firestore");
          const { db } = await import("@/lib/firebase");
          await setDoc(
            doc(db, "users", u.uid),
            {
              uid: u.uid,
              email: u.email || "",
              displayName: u.displayName || u.email?.split("@")[0] || "User",
              photoURL: u.photoURL || "",
              lastSeen: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch {
          // Ignore if Firestore rules don't permit root /users/{uid} document write
        }
      }
    });
    return () => unsubscribe();
  }, []);

  async function signInWithGoogle() {
    await authService.signInWithGoogle();
  }

  async function signOut() {
    await authService.signOut();
  }

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
