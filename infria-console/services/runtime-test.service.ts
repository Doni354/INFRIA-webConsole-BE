/**
 * Shared Runtime Test Service
 *
 * Used by BOTH Dashboard AI and Simulator to call the INFRIA backend.
 * This prevents two different implementations from diverging.
 *
 * Source values:
 *   - DASHBOARD  → Quick AI Test on Dashboard / Project Overview
 *   - SIMULATOR  → Simulator & Trace Debugger page
 */

"use client";

import { auth } from "@/lib/firebase";
import { RuntimeTestRequest, RuntimeTestResponse } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const runtimeTestService = {
  /**
   * Send a message to the INFRIA runtime/console-simulator endpoint.
   * Attaches the Firebase ID token for authentication.
   */
  async sendMessage(req: RuntimeTestRequest): Promise<RuntimeTestResponse> {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("Not authenticated. Please sign in.");

    const res = await fetch(`${API_URL}/runtime/console-simulator`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        projectId: req.projectId,
        sessionId: req.sessionId,
        message: req.message,
        source: req.source,
        conversationHistory: req.conversationHistory ?? [], // LLM memory
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        (err?.error?.message as string) ||
          `Backend error: ${res.status} ${res.statusText}`
      );
    }

    return res.json() as Promise<RuntimeTestResponse>;
  },

  /** Generate a new session ID for a fresh conversation */
  newSessionId(prefix: "dashboard" | "sim" = "sim"): string {
    return `${prefix}_${Math.random().toString(36).substring(2, 10)}`;
  },
};
