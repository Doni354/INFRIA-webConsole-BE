# INFRIA Web Console — Current State & Backend Architecture Plan

**Document:** INFRIA-STATE-001  
**Version:** 1.0  
**Date:** 2026-09-01  
**Purpose:** Dokumentasi lengkap kondisi app saat ini vs Blueprint asli, deviasi beserta alasannya, dan rancangan arsitektur Backend (Firebase Functions) yang akan dibangun.

---

# PART 1 — AUDIT: BLUEPRINT vs IMPLEMENTASI AKTUAL

## 1.1 Checklist — Blueprint Definition of Done (Section 41)

| # | Item Blueprint | Status | Catatan |
|---|----------------|--------|---------|
| 1 | Google Login bekerja | ✅ Done | Firebase Auth (Google Provider) |
| 2 | Personal Workspace terbentuk | ✅ Done | Auto-generated dari `displayName` |
| 3 | Dashboard tampil | ✅ Done | Greeting + project cards + recent activity |
| 4 | Project dapat dibuat | ✅ Done | `/new` → form → Firestore write |
| 5 | Project ID dibuat | ✅ Done | Auto-slug `name-4chars` |
| 6 | Public API Key dibuat | ✅ Done | Generated via `apiKey.service` |
| 7 | Project detail tampil | ✅ Done | Readiness checklist + Playground |
| 8 | Knowledge dapat dibuat | ✅ Done | Full CRUD + chunk preview + category |
| 9 | Function dapat dibuat | ✅ Done | Full CRUD + JSON parameter editor |
| 10 | AI Configuration dapat diubah | ✅ Done | Name, Tone, Language, RAG, Fallback, **Model, BYOK** |
| 11 | SDK snippet dapat ditampilkan | ✅ Done | Dynamic code block per platform |
| 12 | API key dapat di-copy | ✅ Done | Show-once modal saat generate |
| 13 | Playground dapat digunakan | ✅ Done | Mock chat + metadata (route, latency, sources) |
| 14 | Analytics basic dapat ditampilkan | ✅ Done | Metrics cards + activity table |
| 15 | Loading/error/empty state tersedia | ✅ Done | `EmptyState`, `Loader2`, error boundary |
| 16 | Tidak ada data dummy yang seolah live | ✅ Done | Mock layer ada di `services/`, Firestore real untuk CRUD |

**Hasil: 16/16 — Semua Definition of Done terpenuhi.**

---

## 1.2 Checklist — Priority Tiers (Section 39)

### P0 — Must Work (100% ✅)

| Feature | Status |
|---------|--------|
| Google Login | ✅ |
| Personal Workspace | ✅ |
| Dashboard | ✅ |
| Project List | ✅ |
| Create Project | ✅ |
| Project Detail | ✅ |
| API Key | ✅ |
| SDK Setup | ✅ |

### P1 — Core AI Configuration (100% ✅)

| Feature | Status |
|---------|--------|
| Knowledge CRUD | ✅ |
| Function CRUD | ✅ |
| AI Configuration | ✅ |
| Playground | ✅ |

### P2 — Observability (100% ✅)

| Feature | Status |
|---------|--------|
| Analytics | ✅ (mock metrics) |
| Activity | ✅ (mock activity table) |
| Request history | ✅ (tersedia di analytics) |

---

## 1.3 Navigasi & Information Architecture

### Blueprint (Section 6) vs Aktual

```
Blueprint                          Aktual
────────                           ──────
Dashboard                          ✅ app/page.tsx (/)
Projects (list + new)              ✅ app/page.tsx (card grid) + app/new/page.tsx
Project Detail                     ✅ app/(project)/[projectId]/page.tsx
├── Overview                       ✅ (Readiness Checklist + Playground)
├── Knowledge                      ✅ /knowledge (CRUD + chunk viewer)
├── Functions                      ✅ /functions (CRUD + JSON editor)
├── AI Configuration               ✅ /ai (Core Identity + RAG + Prompt Anatomy)
├── SDK & API Keys                 ✅ /sdk (Connected Apps + API Key table)
├── Analytics                      ✅ /analytics (metrics + activity)
└── Simulator (BARU)               ⭐ /simulator (Trace & Action View)
```

> **Catatan**: Route `simulator` adalah **tambahan** yang tidak ada di Blueprint asli. Dibuat sebagai alat debug internal untuk menvisualisasikan trace flow AI (Step 1 → Step N).

---

# PART 2 — DEVIASI DARI BLUEPRINT & ALASAN

## 2.1 Deviasi Positif (Fitur Tambahan)

| # | Fitur | Alasan Ditambahkan |
|---|-------|-------------------|
| 1 | **App Registry** (Connected Apps) | Blueprint hanya menyebut "SDK Setup" sebagai static code block. Kita menambahkan konsep *App Registration* agar developer bisa register multiple client apps (mirip Firebase App) ke satu project. Alasan: karena INFRIA memang berencana multi-platform. |
| 2 | **Simulator / Trace Debugger** | Tidak ada di Blueprint. Ditambahkan sebagai competitive advantage: developer bisa men-debug flow AI secara visual (seperti n8n trace view) tanpa perlu membuka Playground. |
| 3 | **Prompt Anatomy Preview** (AI Config sidebar) | Blueprint hanya menyebut form fields. Kita menambahkan sidebar visual yang menunjukkan bagaimana prompt AI diassemble (System Config → Functions → Context → RAG). Alasan: memberikan *transparency* ke developer tentang apa yang terjadi "di bawah kap mesin". |
| 4 | **LLM Model Selector & BYOK API Key** | Blueprint tidak menyebutkan provider management (bahkan disebut sebagai "P3 — Future"). Ditambahkan karena request user secara eksplisit dan merupakan fitur esensial yang memengaruhi arsitektur Backend. |
| 5 | **Chunk Viewer (Knowledge)** | Blueprint hanya meminta list + detail. Kita menambahkan tab "Preview Dummy Chunks" untuk menvisualisasikan estimasi potongan text yang akan di-vectorisasi. |
| 6 | **Platform Coming Soon** | Blueprint menyebut Flutter sebagai MVP platform. Kita menambahkan UI placeholder untuk Web/iOS/Android dengan label "SOON" agar menunjukkan roadmap ekspansi tanpa membuka fitur belum jadi. |

## 2.2 Deviasi Netral (Perubahan Arsitektur)

| # | Item Blueprint | Implementasi Aktual | Alasan |
|---|----------------|---------------------|--------|
| 1 | Route structure: `/projects/[id]` | `/(project)/[projectId]` | Next.js route group `(project)` digunakan untuk mengisolasi layout sidebar project-level dari layout global. Fungsionalitas sama persis. |
| 2 | Dashboard sebagai halaman terpisah (`/dashboard`) | Dashboard digabung ke root `/` | Karena setelah login, user langsung butuh melihat project list. Menghilangkan satu redirect step. |
| 3 | Separate `sdk.service.ts` | Tidak ada, digabung ke `apiKey.service.ts` + `localStorage` untuk app registry | Service layer tetap bersih dan replaceable. App Registry belum butuh Firestore subcollection. |
| 4 | `workspace.service.ts` | Tidak dibuat terpisah | Workspace saat ini diambil langsung dari `auth.currentUser.displayName`. Cukup untuk single-user prototype. |

## 2.3 Item Blueprint yang BELUM Diimplementasi (Sengaja)

| # | Item | Alasan Ditunda |
|---|------|---------------|
| 1 | Knowledge `Edit` action | Untuk prototype, create + delete + reindex sudah cukup. Edit membutuhkan re-vectorization logic yang harus di-handle Backend. |
| 2 | Knowledge `Archive` action | Membutuhkan lifecycle management yang lebih kompleks. |
| 3 | API Key `Rotate` action | Membutuhkan Backend logic untuk invalidation + re-generation. |
| 4 | `Last Used` column di API Key table | Membutuhkan runtime logging dari Backend. |
| 5 | `SDK Version` display di Project Overview | Belum ada actual SDK package yang bisa di-reference. |

---

# PART 3 — ARSITEKTUR AKTUAL (FRONTEND)

## 3.1 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 (custom design tokens) |
| Auth | Firebase Authentication (Google Sign-In) |
| Database | Cloud Firestore (direct read/write via SDK) |
| State | React `useState` + `useEffect` + `localStorage` (mock registry) |

## 3.2 File Structure

```
infria-console/
├── app/
│   ├── globals.css                 # Design tokens (bg, text, accent, border)
│   ├── layout.tsx                  # Root layout + AuthProvider
│   ├── page.tsx                    # Dashboard (project list + greeting)
│   ├── login/page.tsx              # Google Login
│   ├── new/page.tsx                # Create Project form
│   └── (project)/[projectId]/
│       ├── layout.tsx              # Sidebar navigation (project-scoped)
│       ├── page.tsx                # Project Overview (Readiness + Playground)
│       ├── knowledge/page.tsx      # Knowledge CRUD + Chunk Viewer
│       ├── functions/page.tsx      # Function CRUD + JSON Editor
│       ├── ai/page.tsx             # AI Configuration + Prompt Anatomy
│       ├── sdk/page.tsx            # App Settings + API Keys
│       ├── analytics/page.tsx      # Metrics + Activity Table
│       └── simulator/page.tsx      # Trace Debugger (bonus feature)
├── components/
│   ├── layout/
│   │   ├── Header.tsx              # Top bar (workspace, user avatar, theme)
│   │   ├── AuthProvider.tsx        # Firebase auth context + guard
│   │   └── Sidebar.tsx             # Collapsible project sidebar
│   ├── playground/
│   │   └── Playground.tsx          # Chat interface + metadata display
│   └── ui/
│       ├── Badge.tsx
│       ├── Button.tsx
│       ├── CodeBlock.tsx
│       ├── EmptyState.tsx
│       ├── Loading.tsx
│       ├── ThemeToggle.tsx
│       └── Toast.tsx
├── services/                       # API abstraction layer (replaceable)
│   ├── auth.service.ts
│   ├── project.service.ts
│   ├── knowledge.service.ts
│   ├── function.service.ts
│   ├── ai.service.ts
│   ├── apiKey.service.ts
│   └── analytics.service.ts
├── lib/
│   ├── firebase.ts                 # Firebase app + auth + db init
│   ├── firestore-helpers.ts        # Collection/doc path helpers
│   └── mock-store.ts               # In-memory mock for analytics
└── types/
    └── index.ts                    # All TypeScript interfaces
```

## 3.3 Data Model (Firestore)

```
users/{uid}/
├── projects/{projectId}            → Project
│   ├── knowledge/{knowledgeId}     → Knowledge
│   ├── functions/{functionId}      → ConsoleFunction
│   ├── api_keys/{keyId}            → APIKey
│   └── ai_config (single doc)     → AIConfig
```

## 3.4 Type Definitions (Current)

```typescript
// Core Types
Project { id, name, description?, platform, status, publicApiKey, knowledgeCount, functionCount, createdAt, updatedAt }
Knowledge { id, projectId, title, category, content, status, chunkCount, createdAt, updatedAt }
ConsoleFunction { id, projectId, name, description, parameters, execution, requiresAuth, requiresConfirmation, status, createdAt, updatedAt }
AIConfig { projectId, assistantName, role, language, tone, providerModel, providerApiKey, systemInstructions, fallbackMessage, retrievalTopK, retrievalThreshold, knowledgeEnabled, functionCallingEnabled }
APIKey { id, projectId, name, prefix, status, createdAt, lastUsed }
```

---

# PART 4 — RANCANGAN BACKEND ARCHITECTURE

## 4.1 Tujuan Backend

Backend bertanggung jawab untuk menggantikan **seluruh mock logic** yang saat ini ada di frontend `services/` layer, serta menyediakan runtime AI inference yang akan dikonsumsi oleh Flutter SDK.

```
┌──────────────────┐     ┌──────────────────────┐     ┌───────────────────┐
│  INFRIA Console   │────▶│  Firebase Functions   │────▶│   Cloud Firestore  │
│  (Next.js)        │     │  (Express API)        │     │   (Database)       │
└──────────────────┘     └──────────┬───────────┘     └───────────────────┘
                                    │
                                    │ HTTP
                                    ▼
                          ┌──────────────────────┐
                          │  LLM Provider API     │
                          │  (OpenAI / Anthropic / │
                          │   Gemini)             │
                          └──────────────────────┘
                                    │
                                    │
┌──────────────────┐               │
│  Flutter SDK      │───────────────┘
│  (Client App)     │   via Firebase Functions /v1/runtime/chat
└──────────────────┘
```

## 4.2 Firebase Functions — Project Structure

```
functions/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                    # Express app export
│   ├── middleware/
│   │   ├── auth.ts                 # Firebase ID Token verification
│   │   └── rateLimit.ts            # Per-project rate limiting
│   ├── routes/
│   │   ├── console/                # Console API (dipakai Next.js)
│   │   │   ├── projects.ts
│   │   │   ├── knowledge.ts
│   │   │   ├── functions.ts
│   │   │   ├── ai-config.ts
│   │   │   ├── api-keys.ts
│   │   │   └── analytics.ts
│   │   └── runtime/                # Runtime API (dipakai Flutter SDK)
│   │       └── chat.ts             # POST /v1/runtime/chat
│   ├── services/
│   │   ├── rag.service.ts          # Embedding + Vector Search
│   │   ├── llm.service.ts          # Multi-provider LLM adapter
│   │   ├── function-call.service.ts # Dynamic function calling orchestrator
│   │   └── analytics.service.ts    # Request logging
│   ├── lib/
│   │   ├── firestore.ts            # Admin SDK Firestore helpers
│   │   ├── embedding.ts            # Text → Embedding (OpenAI / Vertex)
│   │   └── chunker.ts              # Smart text chunking
│   └── types/
│       └── index.ts                # Shared types (mirror frontend)
└── .env                            # LLM API keys, config
```

## 4.3 API Endpoints

### Console API (Protected by Firebase Auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/v1/console/projects` | List user's projects |
| `POST` | `/v1/console/projects` | Create project |
| `GET` | `/v1/console/projects/:id` | Get project detail |
| `PUT` | `/v1/console/projects/:id` | Update project |
| `DELETE` | `/v1/console/projects/:id` | Delete project |
| `GET` | `/v1/console/projects/:id/knowledge` | List knowledge entries |
| `POST` | `/v1/console/projects/:id/knowledge` | Create + vectorize knowledge |
| `DELETE` | `/v1/console/projects/:id/knowledge/:kid` | Delete knowledge |
| `POST` | `/v1/console/projects/:id/knowledge/:kid/reindex` | Re-vectorize knowledge |
| `GET` | `/v1/console/projects/:id/functions` | List functions |
| `POST` | `/v1/console/projects/:id/functions` | Create function |
| `PUT` | `/v1/console/projects/:id/functions/:fid` | Update function |
| `DELETE` | `/v1/console/projects/:id/functions/:fid` | Delete function |
| `GET` | `/v1/console/projects/:id/ai-config` | Get AI config |
| `PUT` | `/v1/console/projects/:id/ai-config` | Update AI config |
| `POST` | `/v1/console/projects/:id/api-keys` | Generate API key |
| `DELETE` | `/v1/console/projects/:id/api-keys/:kid` | Revoke API key |
| `GET` | `/v1/console/projects/:id/analytics` | Get analytics metrics |

### Runtime API (Protected by INFRIA API Key)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/v1/runtime/chat` | AI chat completion (RAG + Function Calling) |

## 4.4 Runtime Chat Flow (`POST /v1/runtime/chat`)

```
Flutter SDK Request
    │
    ▼
1. Validate API Key → identify project
    │
    ▼
2. Load AIConfig (system prompt, tone, language, model, thresholds)
    │
    ▼
3. Load available Functions (active functions for this project)
    │
    ▼
4. RAG Pipeline (if enabled):
    │   a. Embed user query → vector
    │   b. Search knowledge chunks (top-K, threshold)
    │   c. Inject matched chunks into prompt context
    │
    ▼
5. Construct LLM Prompt:
    │   [System Config]
    │   [Available Functions as tools]
    │   [RAG Context]
    │   [User Message]
    │
    ▼
6. Call LLM Provider (OpenAI / Anthropic / Gemini)
    │   - Use project's providerModel & providerApiKey (BYOK)
    │   - Or fallback to INFRIA default key
    │
    ▼
7. Handle response:
    │   a. If tool_call → return function call to SDK client
    │   b. If text → return AI response
    │   c. If no match → return fallbackMessage
    │
    ▼
8. Log request to analytics (Firestore subcollection)
    │
    ▼
9. Return response to Flutter SDK
```

## 4.5 RAG Pipeline Detail

```
Knowledge Create/Publish Flow:
─────────────────────────────
Console → POST /knowledge
    │
    ▼
1. Save raw content to Firestore
2. Chunk text (smart overlap ~500-800 chars)
3. Embed each chunk via OpenAI text-embedding-3-small
4. Store vectors in Firestore (or Pinecone/Qdrant for scale)
5. Update knowledge.status = "ready", knowledge.chunkCount = N

Query-Time RAG Flow:
────────────────────
1. Embed user query
2. Vector similarity search (cosine)
3. Filter by threshold (e.g., ≥75%)
4. Take top-K results (e.g., 5)
5. Format as context string
6. Inject into LLM prompt before user message
```

## 4.6 Multi-Provider LLM Adapter

```typescript
// services/llm.service.ts
interface LLMRequest {
  model: LLMModel;
  apiKey: string | null;  // BYOK or INFRIA default
  messages: Message[];
  tools?: ToolDefinition[];
}

// Adapter pattern:
switch (model) {
  case "gpt-4o":
  case "gpt-4o-mini":
    return callOpenAI(request);
  case "claude-3-5-sonnet":
    return callAnthropic(request);
  case "gemini-1.5-pro":
    return callGemini(request);
}
```

## 4.7 Security Model

| Layer | Mechanism |
|-------|-----------|
| Console → Backend | Firebase ID Token (Bearer auth) |
| Flutter SDK → Backend | INFRIA API Key (x-api-key header) |
| Backend → Firestore | Admin SDK (service account) |
| Backend → LLM | Provider API Key (env or BYOK from Firestore) |

```
Console requests:
  Authorization: Bearer <Firebase ID Token>
  → middleware verifies token
  → extracts UID
  → scopes all queries to users/{uid}/

SDK requests:
  x-api-key: infria_pk_xxxxx
  → middleware looks up key in Firestore
  → identifies project owner + projectId
  → scopes all queries to that project
```

## 4.8 Environment Variables (`.env`)

```env
# Firebase
FIREBASE_PROJECT_ID=infria-e1260

# Default LLM Keys (fallback when user doesn't provide BYOK)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=AIza...

# Vector Store (optional, for scale)
PINECONE_API_KEY=...
PINECONE_INDEX=infria-knowledge

# Rate Limiting
RATE_LIMIT_RPM=60
```

---

# PART 5 — MIGRATION PLAN (Frontend → Backend)

## 5.1 Yang Perlu Di-Migrasi

Saat ini frontend langsung baca/tulis Firestore via client SDK. Setelah Backend jadi:

| Current (Frontend Direct) | Target (Via Backend) |
|--------------------------|---------------------|
| `project.service.ts` → Firestore | → `GET/POST /v1/console/projects` |
| `knowledge.service.ts` → Firestore | → `GET/POST /v1/console/projects/:id/knowledge` |
| `function.service.ts` → Firestore | → `GET/POST /v1/console/projects/:id/functions` |
| `ai.service.ts` → Firestore | → `GET/PUT /v1/console/projects/:id/ai-config` |
| `apiKey.service.ts` → Firestore | → `POST/DELETE /v1/console/projects/:id/api-keys` |
| `analytics.service.ts` → mock | → `GET /v1/console/projects/:id/analytics` |

**Key Principle dari Blueprint (Sec 42.3):** Mock → Real tanpa mengubah page architecture. Service layer sudah di-desain untuk ini.

## 5.2 Langkah Implementasi BE

```
Step 1: Init Firebase Functions di project root
        → firebase init functions (TypeScript)

Step 2: Setup Express + middleware (auth.ts)

Step 3: Implement Console API routes
        → projects, knowledge, functions, ai-config, api-keys

Step 4: Implement RAG pipeline
        → chunker + embedding + vector storage

Step 5: Implement LLM adapter service
        → OpenAI, Anthropic, Gemini

Step 6: Implement Runtime Chat endpoint
        → POST /v1/runtime/chat

Step 7: Implement analytics logging

Step 8: Deploy to Firebase Functions

Step 9: Migrate frontend services to call Backend API
        → Replace Firestore direct calls with fetch()

Step 10: End-to-end test
        → Console → Configure → Flutter SDK → Chat → Response
```

---

# PART 6 — KNOWN ISSUES & REVIEW ITEMS

## 6.1 UI Issues to Review

| # | Area | Issue | Severity |
|---|------|-------|----------|
| 1 | Knowledge Table | Title column wrapping sudah di-fix, perlu di-verify visual | Low |
| 2 | Prompt Anatomy line | Garis timeline sudah di-center, perlu di-verify visual | Low |
| 3 | App Settings layout | Sudah diubah ke single-column, perlu confirm UX preference | Low |

## 6.2 Architecture Decisions Pending

| # | Decision | Options | Impact |
|---|----------|---------|--------|
| 1 | Vector Storage | Firestore (simple) vs Pinecone/Qdrant (scalable) | High — affects RAG performance |
| 2 | Embedding Model | OpenAI `text-embedding-3-small` vs Vertex AI | Medium — cost vs latency |
| 3 | API Key Hashing | bcrypt vs SHA-256 + salt | Medium — security |
| 4 | Rate Limiting Strategy | Per-key vs Per-project vs Global | Medium |
| 5 | BYOK Key Encryption | AES-256 at rest in Firestore | High — security |

---

**END OF DOCUMENT**
