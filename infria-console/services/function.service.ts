"use client";

import {
  getDocs,
  getDoc,
  deleteDoc,
  addDoc,
  updateDoc,
} from "firebase/firestore";
import { auth } from "@/lib/firebase";
import {
  functionsCol,
  functionDoc,
  now,
} from "@/lib/firestore-helpers";
import { ConsoleFunction, CreateFunctionInput } from "@/types";

function getUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("User not authenticated");
  return uid;
}

export const functionService = {
  async list(projectId: string): Promise<ConsoleFunction[]> {
    const uid = getUid();
    const snap = await getDocs(functionsCol(uid, projectId));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ConsoleFunction, "id">) }));
  },

  async get(projectId: string, id: string): Promise<ConsoleFunction> {
    const uid = getUid();
    const snap = await getDoc(functionDoc(uid, projectId, id));
    if (!snap.exists()) throw new Error(`Function not found: ${id}`);
    return { id: snap.id, ...(snap.data() as Omit<ConsoleFunction, "id">) };
  },

  async create(input: CreateFunctionInput): Promise<ConsoleFunction> {
    const uid = getUid();
    const fn = {
      projectId: input.projectId,
      name: input.name,
      description: input.description,
      parameters: input.parameters,
      execution: { type: "client_callback" as const },
      requiresAuth: input.requiresAuth,
      requiresConfirmation: input.requiresConfirmation,
      status: "active" as const,
      createdAt: now(),
      updatedAt: now(),
    };
    const ref = await addDoc(functionsCol(uid, input.projectId), fn);
    return { id: ref.id, ...fn };
  },

  async update(projectId: string, id: string, updates: Partial<ConsoleFunction>): Promise<void> {
    const uid = getUid();
    await updateDoc(functionDoc(uid, projectId, id), { ...updates, updatedAt: now() });
  },

  async delete(projectId: string, id: string): Promise<void> {
    const uid = getUid();
    await deleteDoc(functionDoc(uid, projectId, id));
  },

  generateFlutterSnippet(fn: ConsoleFunction): string {
    const paramsExample = Object.keys(fn.parameters.properties)
      .map((k) => `      args['${k}'],`)
      .join("\n");
    return `infria.registerFunction(\n  '${fn.name}',\n  (args) async {\n    // TODO: implement your function logic\n${paramsExample}\n    return {'result': 'success'};\n  },\n);`;
  },
};
