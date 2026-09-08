import { collection, doc, CollectionReference, DocumentReference } from "firebase/firestore";
import { db } from "./firebase";

// ── Path helpers (untyped for write-safe usage) ──────────────────────────────

export function projectsCol(uid: string): CollectionReference {
  return collection(db, "users", uid, "projects");
}

export function projectDoc(uid: string, projectId: string): DocumentReference {
  return doc(db, "users", uid, "projects", projectId);
}

export function knowledgeCol(uid: string, projectId: string): CollectionReference {
  return collection(db, "users", uid, "projects", projectId, "knowledge");
}

export function knowledgeDoc(uid: string, projectId: string, knowledgeId: string): DocumentReference {
  return doc(db, "users", uid, "projects", projectId, "knowledge", knowledgeId);
}

export function functionsCol(uid: string, projectId: string): CollectionReference {
  return collection(db, "users", uid, "projects", projectId, "functions");
}

export function functionDoc(uid: string, projectId: string, fnId: string): DocumentReference {
  return doc(db, "users", uid, "projects", projectId, "functions", fnId);
}

export function aiConfigDoc(uid: string, projectId: string): DocumentReference {
  return doc(db, "users", uid, "projects", projectId, "ai_config", "config");
}

export function analyticsEventsCol(uid: string, projectId: string): CollectionReference {
  return collection(db, "users", uid, "projects", projectId, "analyticsEvents");
}

export function chatSessionsCol(uid: string, projectId: string): CollectionReference {
  return collection(db, "users", uid, "projects", projectId, "chatSessions");
}

export function chatSessionDoc(uid: string, projectId: string, sessionId: string): DocumentReference {
  return doc(db, "users", uid, "projects", projectId, "chatSessions", sessionId);
}

export function chatMessagesCol(uid: string, projectId: string, sessionId: string): CollectionReference {
  return collection(db, "users", uid, "projects", projectId, "chatSessions", sessionId, "messages");
}

// ── Utilities ──────────────────────────────────────────────────

export function now(): string {
  return new Date().toISOString();
}

export function generateApiKey(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  return "infria_pk_" + Array.from({ length: 24 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export function maskApiKey(key: string): string {
  return key.slice(0, 14) + "••••" + key.slice(-4);
}

export function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 30);
}
