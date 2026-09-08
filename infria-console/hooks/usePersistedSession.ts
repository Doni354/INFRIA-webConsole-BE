"use client";

/**
 * usePersistedSession
 *
 * Persists the active simulator session ID in sessionStorage so it survives
 * tab/sidebar navigation without being reset. Only resets when explicitly
 * called (e.g. user presses "Reset" or "New Session" button).
 *
 * Storage key: infria_session_{projectId}_{type}
 */

import { useState, useEffect, useCallback } from "react";
import { runtimeTestService } from "@/services/runtime-test.service";

type SessionType = "sim" | "dashboard";

export function usePersistedSession(projectId: string, type: SessionType) {
  const storageKey = `infria_session_${projectId}_${type}`;

  const [sessionId, setSessionId] = useState<string>(() => {
    // Read from sessionStorage on first render (avoids SSR mismatch)
    if (typeof window === "undefined") {
      return runtimeTestService.newSessionId(type);
    }
    return (
      sessionStorage.getItem(storageKey) ??
      runtimeTestService.newSessionId(type)
    );
  });

  // Sync to sessionStorage whenever sessionId changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(storageKey, sessionId);
    }
  }, [sessionId, storageKey]);

  const resetSession = useCallback(() => {
    const newId = runtimeTestService.newSessionId(type);
    setSessionId(newId);
    return newId;
  }, [type]);

  return { sessionId, resetSession };
}
