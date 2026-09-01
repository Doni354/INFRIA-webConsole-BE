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
  role: "Customer Service",
  language: "Indonesian",
  tone: "friendly",
  providerModel: "gpt-4o-mini",
  providerApiKey: null,
  systemInstructions:
    "Kamu adalah asisten AI yang membantu menjawab pertanyaan pengguna dengan ramah dan informatif.",
  fallbackMessage:
    "Maaf, saya tidak dapat menjawab pertanyaan tersebut saat ini. Silakan hubungi tim kami.",
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
