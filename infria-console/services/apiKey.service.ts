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
    const rawKey = generateApiKey();
    const keyData = {
      projectId,
      name,
      prefix: rawKey.slice(0, 18) + "••••",
      status: "active" as const,
      createdAt: now(),
      lastUsed: null,
    };
    const ref = await addDoc(keysCol(projectId), keyData);
    return { key: { id: ref.id, ...keyData }, rawKey };
  },

  async revoke(projectId: string, keyId: string): Promise<void> {
    await updateDoc(keyDoc(projectId, keyId), { status: "revoked" });
  },
};
