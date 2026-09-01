"use client";

import {
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  addDoc,
  updateDoc,
} from "firebase/firestore";
import { auth } from "@/lib/firebase";
import {
  knowledgeCol,
  knowledgeDoc,
  now,
} from "@/lib/firestore-helpers";
import { Knowledge, CreateKnowledgeInput } from "@/types";

function getUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("User not authenticated");
  return uid;
}

export const knowledgeService = {
  async list(projectId: string): Promise<Knowledge[]> {
    const uid = getUid();
    const snap = await getDocs(knowledgeCol(uid, projectId));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Knowledge, "id">) }));
  },

  async get(projectId: string, id: string): Promise<Knowledge> {
    const uid = getUid();
    const snap = await getDoc(knowledgeDoc(uid, projectId, id));
    if (!snap.exists()) throw new Error(`Knowledge not found: ${id}`);
    return { id: snap.id, ...(snap.data() as Omit<Knowledge, "id">) };
  },

  async createDraft(input: CreateKnowledgeInput): Promise<Knowledge> {
    const uid = getUid();
    const item = {
      projectId: input.projectId,
      title: input.title,
      category: input.category,
      content: input.content,
      status: "draft" as const,
      chunkCount: 0,
      createdAt: now(),
      updatedAt: now(),
    };
    const ref = await addDoc(knowledgeCol(uid, input.projectId), item);
    return { id: ref.id, ...item };
  },

  async publish(projectId: string, id: string): Promise<void> {
    const uid = getUid();
    
    // Quick local optimistic update to layout shift 
    await updateDoc(knowledgeDoc(uid, projectId, id), {
      status: "processing",
      updatedAt: now(),
    });

    const snap = await getDoc(knowledgeDoc(uid, projectId, id));
    if (!snap.exists()) throw new Error(`Knowledge not found: ${id}`);
    
    const text = snap.data().content;
    const token = await auth.currentUser?.getIdToken();
    
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/knowledge/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ projectId, knowledgeId: id, text })
    });
    
    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      throw new Error(errData?.error?.message || "Failed to trigger publish");
    }
  },

  async update(projectId: string, id: string, updates: Partial<Knowledge>): Promise<void> {
    const uid = getUid();
    await updateDoc(knowledgeDoc(uid, projectId, id), { ...updates, updatedAt: now() });
  },

  async reindex(projectId: string, id: string): Promise<void> {
    const uid = getUid();
    
    await updateDoc(knowledgeDoc(uid, projectId, id), { status: "processing", updatedAt: now() });
    
    const snap = await getDoc(knowledgeDoc(uid, projectId, id));
    if (!snap.exists()) throw new Error("Item not found");
    
    const text = snap.data().content;
    const token = await auth.currentUser?.getIdToken();
    
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/knowledge/reindex`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ projectId, knowledgeId: id, text })
    });
    
    if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error?.message || "Failed to trigger reindex");
    }
  },

  async archive(projectId: string, id: string): Promise<void> {
    const uid = getUid();
    await updateDoc(knowledgeDoc(uid, projectId, id), { status: "archived", updatedAt: now() });
  },

  async delete(projectId: string, id: string): Promise<void> {
    const uid = getUid();
    await deleteDoc(knowledgeDoc(uid, projectId, id));
  },
};
