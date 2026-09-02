"use client";

import {
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { auth } from "@/lib/firebase";
import {
  projectsCol,
  projectDoc,
  generateApiKey,
  maskApiKey,
  now,
  slugify,
} from "@/lib/firestore-helpers";
import {
  Project,
  CreateProjectInput,
  CreateProjectResult,
} from "@/types";

function getUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("User not authenticated");
  return uid;
}

export const projectService = {
  async list(): Promise<Project[]> {
    const uid = getUid();
    const snap = await getDocs(projectsCol(uid));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Project, "id">) }));
  },

  async get(projectId: string): Promise<Project> {
    const uid = getUid();
    const snap = await getDoc(projectDoc(uid, projectId));
    if (!snap.exists()) throw new Error(`Project not found: ${projectId}`);
    return { id: snap.id, ...(snap.data() as Omit<Project, "id">) };
  },

  async create(input: CreateProjectInput): Promise<CreateProjectResult> {
    const uid = getUid();
    const rawKey = generateApiKey();
    const projectId = slugify(input.name) + "-" + Math.random().toString(36).slice(2, 6);
    const project: Project = {
      id: projectId,
      name: input.name,
      description: input.description || "",
      platform: input.platform || null,
      status: "active",
      publicApiKey: rawKey,
      knowledgeCount: 0,
      functionCount: 0,
      createdAt: now(),
      updatedAt: now(),
    };
    await setDoc(projectDoc(uid, projectId), project);
    return { project, publicApiKey: rawKey };
  },

  async delete(projectId: string): Promise<void> {
    const uid = getUid();
    await deleteDoc(projectDoc(uid, projectId));
  },

  async incrementKnowledgeCount(projectId: string): Promise<void> {
    const uid = getUid();
    const snap = await getDoc(projectDoc(uid, projectId));
    if (!snap.exists()) return;
    const current = (snap.data() as Project).knowledgeCount || 0;
    await updateDoc(projectDoc(uid, projectId), { knowledgeCount: current + 1, updatedAt: now() });
  },

  async decrementKnowledgeCount(projectId: string): Promise<void> {
    const uid = getUid();
    const snap = await getDoc(projectDoc(uid, projectId));
    if (!snap.exists()) return;
    const current = (snap.data() as Project).knowledgeCount || 0;
    await updateDoc(projectDoc(uid, projectId), { knowledgeCount: Math.max(0, current - 1), updatedAt: now() });
  },

  async incrementFunctionCount(projectId: string): Promise<void> {
    const uid = getUid();
    const snap = await getDoc(projectDoc(uid, projectId));
    if (!snap.exists()) return;
    const current = (snap.data() as Project).functionCount || 0;
    await updateDoc(projectDoc(uid, projectId), { functionCount: current + 1, updatedAt: now() });
  },

  async decrementFunctionCount(projectId: string): Promise<void> {
    const uid = getUid();
    const snap = await getDoc(projectDoc(uid, projectId));
    if (!snap.exists()) return;
    const current = (snap.data() as Project).functionCount || 0;
    await updateDoc(projectDoc(uid, projectId), { functionCount: Math.max(0, current - 1), updatedAt: now() });
  },
};
