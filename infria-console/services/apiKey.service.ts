"use client";

import {
  getDocs,
  addDoc,
  updateDoc,
} from "firebase/firestore";
import { auth } from "@/lib/firebase";
import { collection, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { APIKey } from "@/types";
import { now, generateApiKey, maskApiKey } from "@/lib/firestore-helpers";

function getUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("User not authenticated");
  return uid;
}

function keysCol(projectId: string) {
  return collection(db, "users", getUid(), "projects", projectId, "api_keys");
}
function keyDoc(projectId: string, keyId: string) {
  return doc(db, "users", getUid(), "projects", projectId, "api_keys", keyId);
}

export const apiKeyService = {
  async list(projectId: string): Promise<APIKey[]> {
    const snap = await getDocs(keysCol(projectId));
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<APIKey, "id">) }));
  },

  async generate(projectId: string, name: string): Promise<{ key: APIKey; rawKey: string }> {
    const token = await auth.currentUser?.getIdToken();
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api-keys/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ projectId, name, environment: "production" })
    });
    
    if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error?.message || "Failed to generate API Key");
    }
    const data = await res.json();
    
    const mockKey = {
      id: data.id,
      projectId,
      name,
      prefix: data.key.slice(0, 18) + "••••",
      status: "active" as const,
      createdAt: now(),
      lastUsed: null,
    };
    return { key: mockKey, rawKey: data.key };
  },

  async revoke(projectId: string, keyId: string): Promise<void> {
    const token = await auth.currentUser?.getIdToken();
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api-keys/revoke`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ projectId, keyId })
    });
    
    if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error?.message || "Failed to revoke API Key");
    }
  },
};
