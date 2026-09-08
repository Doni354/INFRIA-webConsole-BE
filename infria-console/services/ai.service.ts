"use client";

import { getDoc, setDoc } from "firebase/firestore";
import { auth } from "@/lib/firebase";
import { aiConfigDoc, now } from "@/lib/firestore-helpers";
import { AIConfig } from "@/types";

function getUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("User not authenticated");
  return uid;
}

const defaultConfig = (projectId: string): AIConfig => ({
  projectId,
  assistantName: "INFRIA Assistant",
  role: "Customer Support",
  language: "English",
  tone: "friendly",
  providerModel: "gpt-4o-mini",
  providerApiKey: null,
  systemInstructions:
    "You are a helpful, accurate, and professional AI assistant. Provide concise and polite responses based on the provided context.",
  fallbackMessage:
    "I apologize, but I do not have enough information to answer that question right now. Please reach out to our support team for assistance.",
  retrievalTopK: 5,
  retrievalThreshold: 0.7,
  knowledgeEnabled: true,
  functionCallingEnabled: true,
});

export const aiService = {
  async get(projectId: string): Promise<AIConfig> {
    const uid = getUid();
    const snap = await getDoc(aiConfigDoc(uid, projectId));
    if (!snap.exists()) return defaultConfig(projectId);
    return snap.data() as AIConfig;
  },

  async save(config: AIConfig): Promise<AIConfig> {
    const uid = getUid();
    // Use setDoc with merge to avoid overwriting existing fields
    const { projectId, ...rest } = config;
    await setDoc(aiConfigDoc(uid, projectId), { projectId, ...rest, updatedAt: now() } as object, { merge: true });
    return config;
  },
};
