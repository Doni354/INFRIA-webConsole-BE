/**
 * Chat Session Service
 *
 * Stores and retrieves persistent chat sessions in Firestore.
 * Path: users/{uid}/projects/{projectId}/chatSessions/{sessionId}/messages/{msgId}
 *
 * This enables:
 * - ChatGPT-like session list in Simulator sidebar
 * - Persistent conversation memory (cross tab/refresh)
 * - Session history for analytics/benchmarking
 * - Delete individual sessions
 */

"use client";

import {
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  collection,
} from "firebase/firestore";
import { auth } from "@/lib/firebase";
import {
  chatSessionsCol,
  chatSessionDoc,
  chatMessagesCol,
} from "@/lib/firestore-helpers";
import { PlaygroundMessage, ExecutionSource } from "@/types";

export interface ChatSession {
  id: string;
  projectId: string;
  title: string;
  source: ExecutionSource;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

function getUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not authenticated");
  return uid;
}

function generateTitle(firstUserMessage: string): string {
  const trimmed = firstUserMessage.trim();
  return trimmed.length > 60 ? trimmed.slice(0, 60) + "…" : trimmed;
}

export const chatSessionService = {
  /**
   * List all sessions for a project, sorted by most recently updated.
   */
  async list(projectId: string): Promise<ChatSession[]> {
    const uid = getUid();
    const col = chatSessionsCol(uid, projectId);
    const snap = await getDocs(
      query(col, orderBy("updatedAt", "desc"), limit(50))
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChatSession));
  },

  /**
   * Create a new session document (no messages yet).
   */
  async create(
    projectId: string,
    sessionId: string,
    source: ExecutionSource,
    firstMessage: string
  ): Promise<ChatSession> {
    const uid = getUid();
    const now = new Date().toISOString();
    const session: ChatSession = {
      id: sessionId,
      projectId,
      title: generateTitle(firstMessage),
      source,
      messageCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(chatSessionDoc(uid, projectId, sessionId), session);
    return session;
  },

  /**
   * Append a message to the session and update metadata.
   */
  async addMessage(
    projectId: string,
    sessionId: string,
    message: Omit<PlaygroundMessage, "id">
  ): Promise<void> {
    const uid = getUid();
    const msgCol = chatMessagesCol(uid, projectId, sessionId);

    await addDoc(msgCol, {
      role: message.role,
      content: message.content,
      timestamp: message.timestamp,
      metadata: message.metadata ?? null,
    });

    // Update session metadata
    const sessionRef = chatSessionDoc(uid, projectId, sessionId);
    const snap = await getDoc(sessionRef);
    if (snap.exists()) {
      const current = snap.data() as ChatSession;
      await setDoc(
        sessionRef,
        {
          ...current,
          messageCount: current.messageCount + 1,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }
  },

  /**
   * Load all messages for a session (up to 200 — sufficient for memory).
   */
  async getMessages(
    projectId: string,
    sessionId: string
  ): Promise<PlaygroundMessage[]> {
    const uid = getUid();
    const col = chatMessagesCol(uid, projectId, sessionId);
    const snap = await getDocs(
      query(col, orderBy("timestamp", "asc"), limit(200))
    );
    return snap.docs.map((d) => ({
      id: d.id,
      role: d.data().role,
      content: d.data().content,
      timestamp: d.data().timestamp,
      metadata: d.data().metadata ?? undefined,
    }));
  },

  /**
   * Delete a session and all its messages.
   * Note: Firestore does not auto-delete subcollections — we delete messages first.
   */
  async delete(projectId: string, sessionId: string): Promise<void> {
    const uid = getUid();

    // Delete all messages first
    const msgCol = chatMessagesCol(uid, projectId, sessionId);
    const snap = await getDocs(msgCol);
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));

    // Delete session document
    await deleteDoc(chatSessionDoc(uid, projectId, sessionId));
  },

  /**
   * Get last N messages as conversation history for LLM context.
   */
  async getHistory(
    projectId: string,
    sessionId: string,
    maxMessages = 10
  ): Promise<{ role: "user" | "assistant"; content: string }[]> {
    const messages = await this.getMessages(projectId, sessionId);
    return messages
      .slice(-maxMessages)
      .map((m) => ({ role: m.role, content: m.content }));
  },
};
