// ==================
// Auth & User
// ==================
export interface ConsoleUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface Workspace {
  id: string;
  name: string; // e.g. "Doni's Workspace"
  ownerId: string;
}

// ==================
// Project
// ==================
export type ProjectStatus = "active" | "inactive";
// Platform kini tidak wajib saat initial create
export type ProjectPlatform = "flutter" | "react-native" | "ios" | "android" | "web" | "unity" | null;

export interface Project {
  id: string; // e.g. "infria-demo-store-7f42"
  name: string;
  description?: string;
  platform: ProjectPlatform;
  status: ProjectStatus;
  publicApiKey: string; // masked after creation: "infria_pk_****xxxx"
  knowledgeCount: number;
  functionCount: number;
  createdAt: string; // ISO string
  updatedAt: string;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  platform?: ProjectPlatform;
}

export interface CreateProjectResult {
  project: Project;
  publicApiKey: string; // shown once only
}

// ==================
// Knowledge
// ==================
export type KnowledgeStatus =
  | "draft"
  | "processing"
  | "ready"
  | "failed"
  | "archived";

export interface Knowledge {
  id: string;
  projectId: string;
  title: string;
  category: string;
  content: string;
  status: KnowledgeStatus;
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateKnowledgeInput {
  projectId: string;
  title: string;
  category: string;
  content: string;
}

// ==================
// Function
// ==================
export type ExecutionType = "client_callback";

export interface FunctionParameter {
  type: "object";
  properties: Record<string, { type: string; description?: string }>;
  required?: string[];
}

export interface ConsoleFunction {
  id: string;
  projectId: string;
  name: string; // snake_case
  description: string;
  parameters: FunctionParameter;
  execution: { type: ExecutionType };
  requiresAuth: boolean;
  requiresConfirmation: boolean;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export interface CreateFunctionInput {
  projectId: string;
  name: string;
  description: string;
  parameters: FunctionParameter;
  requiresAuth: boolean;
  requiresConfirmation: boolean;
}

// ==================
// AI Configuration
// ==================
export type Tone = "friendly" | "professional" | "formal" | "casual";
export type Language = "Indonesian" | "English" | "Bilingual";
export type LLMModel = "gpt-4o" | "gpt-4o-mini" | "claude-3-5-sonnet" | "gemini-1.5-pro";

export interface AIConfig {
  projectId: string;
  assistantName: string;
  role: string;
  language: Language;
  tone: Tone;
  providerModel: LLMModel;
  providerApiKey: string | null;
  systemInstructions: string;
  fallbackMessage: string;
  retrievalTopK: number;
  retrievalThreshold: number;
  knowledgeEnabled: boolean;
  functionCallingEnabled: boolean;
}

// ==================
// API Key
// ==================
export type APIKeyStatus = "active" | "revoked";

export interface APIKey {
  id: string;
  projectId: string;
  name: string;
  prefix: string; // e.g. "infria_pk_"
  status: APIKeyStatus;
  createdAt: string;
  lastUsed: string | null;
}

// ==================
// Analytics
// ==================
export interface AnalyticsMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  functionCalls: number;
  fallbacks: number;
  avgLatencyMs: number;
}

export interface ActivityEntry {
  id: string;
  projectId: string;
  timestamp: string;
  type: "chat" | "function_call";
  endpoint?: string;
  functionName?: string;
  status: "success" | "error";
  latencyMs: number;
}

// ==================
// Playground
// ==================
export interface PlaygroundMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  metadata?: {
    route?: "RAG" | "DIRECT" | "FUNCTION";
    latencyMs?: number;
    sources?: number;
    functionCall?: { name: string; args: Record<string, unknown> };
  };
}
