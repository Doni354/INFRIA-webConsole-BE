# INFRIA — Backend Implementation Blueprint

**Document ID:** INFRIA-BE-001  
**Version:** 0.1  
**Status:** Implementation Baseline / Locked Architecture  
**Depends On:** `INFRIA-SADD-v0.4-Locked.md`  
**Target:** Firebase Cloud Functions + Node.js/Express + Firestore + n8n  
**Primary Runtime Consumer:** INFRIA Flutter SDK

---

# 0. Purpose

Dokumen ini adalah **implementation blueprint untuk Backend INFRIA**.

Dokumen ini ditujukan secara langsung untuk AI coding agent seperti Antigravity dan developer backend.

Tujuan utamanya bukan mendeskripsikan produk INFRIA secara umum, tetapi menerjemahkan SADD v0.4 menjadi:

- struktur project backend;
- boundary frontend ↔ Firestore ↔ Functions;
- endpoint contract;
- authentication dan tenant resolution;
- runtime AI protocol;
- Function Calling protocol;
- n8n adapter;
- Firestore access pattern;
- validation;
- error handling;
- idempotency;
- logging;
- urutan implementasi.

> **SOURCE OF TRUTH:** Jika terjadi konflik antara dokumen ini dengan `INFRIA-SADD-v0.4-Locked.md`, ikuti SADD. Jangan mengubah keputusan `LOCKED` secara sepihak.

---

# 1. Backend Role in INFRIA

Backend INFRIA adalah **trust boundary dan runtime gateway**.

Backend bukan sekadar CRUD API.

Backend memiliki dua tanggung jawab besar:

```text
1. Trusted Operations
2. AI Runtime
```

### Trusted Operations

Contoh:

- generate/revoke/rotate API key;
- embedding dan reindex knowledge;
- validasi BYOK;
- AI playground;
- external call ke n8n/LLM;
- policy validation;
- operation yang membutuhkan secret;
- operation yang tidak boleh dipercaya dari client.

### AI Runtime

Contoh:

```text
Flutter SDK
    ↓
POST /v1/runtime/chat
    ↓
Credential Validation
    ↓
Tenant Resolution
    ↓
Project Configuration
    ↓
RAG / Function Registry
    ↓
n8n
    ↓
LLM
    ↓
message / function_call
```

---

# 2. Locked Architecture

## 2.1. Overall

```text
                    WEB CONSOLE
                      Next.js
                      Vercel
                         │
             ┌───────────┴───────────┐
             │                       │
       Direct Firestore        Firebase Functions
       safe/read/simple        privileged/processing
             │                       │
             └───────────┬───────────┘
                         │
                      Firestore


                     AI RUNTIME

Flutter SDK
    │
    │ HTTPS / JSON
    ▼
Firebase Functions
    │
    ├── API Key Validation
    ├── Tenant Resolution
    ├── Project Validation
    ├── Function Policy
    └── Orchestration Gateway
             │
             ▼
            n8n
             │
        ┌────┼─────┐
        ▼    ▼     ▼
       RAG  Tools  LLM
        │    │     │
        └────┼─────┘
             │
             ▼
     message / function_call
             │
             ▼
        Flutter SDK
             │
       local callback
             │
             ▼
      function-result
             │
             ▼
        Firebase Functions
             │
             ▼
            n8n
             │
             ▼
       final response
```

---

# 3. What Backend Must NOT Do

Backend tidak boleh:

- menjadi proxy untuk semua `GET` Console;
- memindahkan semua read Firestore ke Functions tanpa alasan;
- memberikan LLM API key ke Flutter;
- memberikan n8n endpoint langsung ke Flutter;
- mempercayai `projectId` dari request tanpa validasi credential;
- mempercayai function call dari LLM tanpa policy validation;
- melakukan direct call ke business function Flutter;
- menahan HTTP request untuk menunggu Flutter callback;
- menyimpan secret pada frontend;
- menggunakan n8n sebagai authorization authority.

---

# 4. Technology Stack

Gunakan:

```text
Node.js
TypeScript
Firebase Cloud Functions
Express
Firebase Admin SDK
Cloud Firestore
n8n
```

Optional / supporting:

```text
Zod
Pino
UUID / crypto
Vitest / Jest
```

Jangan menambah framework backend lain kecuali ada kebutuhan yang jelas.

---

# 5. Backend Repository Structure

Gunakan struktur modular berikut:

```text
functions/
├── src/
│
│   ├── index.ts
│   │
│   ├── api/
│   │   └── app.ts
│   │
│   ├── config/
│   │   ├── env.ts
│   │   └── firebase.ts
│   │
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── project-auth.ts
│   │   ├── tenant.ts
│   │   ├── validation.ts
│   │   ├── rate-limit.ts
│   │   └── error-handler.ts
│   │
│   ├── modules/
│   │   ├── projects/
│   │   │   ├── project.routes.ts
│   │   │   ├── project.controller.ts
│   │   │   ├── project.service.ts
│   │   │   └── project.schema.ts
│   │   │
│   │   ├── knowledge/
│   │   │   ├── knowledge.routes.ts
│   │   │   ├── knowledge.controller.ts
│   │   │   ├── knowledge.service.ts
│   │   │   └── knowledge.schema.ts
│   │   │
│   │   ├── functions/
│   │   │   ├── function.routes.ts
│   │   │   ├── function.controller.ts
│   │   │   ├── function.service.ts
│   │   │   └── function.schema.ts
│   │   │
│   │   ├── ai-config/
│   │   │   ├── ai-config.routes.ts
│   │   │   ├── ai-config.controller.ts
│   │   │   ├── ai-config.service.ts
│   │   │   └── ai-config.schema.ts
│   │   │
│   │   ├── api-keys/
│   │   │   ├── api-key.routes.ts
│   │   │   ├── api-key.controller.ts
│   │   │   ├── api-key.service.ts
│   │   │   └── api-key.schema.ts
│   │   │
│   │   ├── runtime/
│   │   │   ├── runtime.routes.ts
│   │   │   ├── runtime.controller.ts
│   │   │   ├── runtime.service.ts
│   │   │   ├── runtime.schema.ts
│   │   │   ├── runtime-state.service.ts
│   │   │   └── runtime-types.ts
│   │   │
│   │   └── analytics/
│   │       ├── analytics.service.ts
│   │       └── analytics.repository.ts
│   │
│   ├── repositories/
│   │   ├── project.repository.ts
│   │   ├── knowledge.repository.ts
│   │   ├── function.repository.ts
│   │   ├── config.repository.ts
│   │   ├── api-key.repository.ts
│   │   ├── runtime.repository.ts
│   │   └── analytics.repository.ts
│   │
│   ├── integrations/
│   │   ├── n8n/
│   │   │   ├── n8n.client.ts
│   │   │   ├── n8n.adapter.ts
│   │   │   └── n8n.types.ts
│   │   │
│   │   └── llm/
│   │       ├── llm.types.ts
│   │       └── llm.provider.ts
│   │
│   ├── ai/
│   │   ├── rag/
│   │   │   ├── chunker.ts
│   │   │   ├── embedding.service.ts
│   │   │   └── retrieval.service.ts
│   │   │
│   │   ├── function-calling/
│   │   │   ├── function-policy.service.ts
│   │   │   ├── function-validator.ts
│   │   │   └── function-protocol.ts
│   │   │
│   │   └── orchestration/
│   │       ├── orchestration.service.ts
│   │       └── orchestration.types.ts
│   │
│   ├── shared/
│   │   ├── errors/
│   │   ├── logging/
│   │   ├── utils/
│   │   └── types/
│   │
│   └── tests/
│       ├── unit/
│       └── integration/
│
├── package.json
├── tsconfig.json
└── .env.example
```

---

# 6. Dependency Direction

Jangan membalik dependency.

```text
HTTP Route
    ↓
Middleware
    ↓
Controller
    ↓
Service
    ↓
Repository
    ↓
Firestore
```

External integration:

```text
Service
    ↓
Adapter
    ↓
n8n / External Provider
```

AI:

```text
Runtime Service
    ↓
Orchestration Service
    ↓
n8n Adapter
```

Repository tidak boleh memanggil n8n.

Controller tidak boleh langsung mengakses Firestore.

---

# 7. Firebase Function Entry Point

Gunakan satu Express application sebagai API entry point.

Konsep:

```typescript
import { onRequest } from "firebase-functions/v2/https";

export const api = onRequest(
  {
    region: "asia-southeast2",
  },
  app
);
```

`app.ts` bertugas memasang:

```text
cors
request-id
logging
routes
error-handler
```

Gunakan region sesuai deployment baseline project.

---

# 8. Route Mounting

Gunakan:

```text
/v1
```

Kemudian:

```text
/v1/console/*
/v1/runtime/*
```

Contoh:

```text
POST /v1/runtime/chat
POST /v1/runtime/function-result
```

Console routes hanya dibuat untuk operation yang memang membutuhkan Functions.

---

# 9. Console API Boundary

## Direct Firestore

Web Console boleh menggunakan Firebase Client SDK secara langsung untuk:

```text
GET/list projects
GET/list knowledge
GET/list functions
GET AI config
GET API key metadata
simple metadata CRUD yang dapat diamankan penuh oleh Firestore Rules
```

Jangan membuat:

```text
GET /v1/console/projects
GET /v1/console/projects/:id/knowledge
GET /v1/console/projects/:id/functions
```

hanya untuk mem-proxy Firestore apabila tidak ada kebutuhan server-side.

## Functions

Gunakan Functions untuk:

```text
API key generation
API key rotation
API key revoke jika membutuhkan trusted server-side operation
Knowledge publish
Embedding generation
Knowledge reindex
BYOK validation
AI Playground / inference
Runtime AI
External n8n calls
Sensitive / privileged operations
```

---

# 10. Console-to-Backend Rule

Gunakan prinsip:

> **Client reads data directly when Firestore Security Rules are sufficient. Server executes when trust, secret, processing, or external integration is required.**

Jangan menganggap Functions sebagai “default gateway untuk semua data”.

---

# 11. Authentication

## 11.1. Console

Firebase Authentication:

```text
Google Sign-In
    ↓
Firebase User
    ↓
ID Token
```

Untuk endpoint protected:

```http
Authorization: Bearer <FIREBASE_ID_TOKEN>
```

Middleware:

```text
verifyIdToken()
    ↓
req.user.uid
```

---

# 12. Console Authorization

Setelah UID diperoleh:

```text
Firebase UID
    ↓
Resolve Personal Workspace
    ↓
Verify Project Ownership / Membership
    ↓
Allow Operation
```

Tidak boleh cukup dengan:

```text
request.auth != null
```

karena user yang valid belum tentu memiliki project target.

---

# 13. Runtime Authentication

Flutter SDK menggunakan:

```http
x-api-key: inf_pub_xxxxx
```

Optional project hint:

```http
x-project-id: prj_demo
```

Namun:

> `projectId` dari client selalu dianggap untrusted input.

Backend harus:

```text
API Key
    ↓
hash / lookup
    ↓
resolve apiKey
    ↓
resolve project
    ↓
validate status
    ↓
create TenantContext
```

---

# 14. Tenant Context

Gunakan internal context:

```typescript
interface TenantContext {
  workspaceId: string;
  projectId: string;
  apiKeyId: string;
}
```

Jika request runtime membutuhkan user identity:

```typescript
interface RuntimeContext extends TenantContext {
  sessionId: string;
  externalUserId?: string;
}
```

Semua service runtime harus menerima context.

Contoh:

```typescript
runtimeService.chat({
  tenant,
  sessionId,
  message,
});
```

Jangan:

```typescript
runtimeService.chat(projectId);
```

tanpa context validation.

---

# 15. Firestore Data Model

Baseline:

```text
users/{uid}
    └── workspaces/{workspaceId}
            └── projects/{projectId}
                    ├── knowledge/{knowledgeId}
                    │       └── chunks/{chunkId}
                    │
                    ├── functions/{functionId}
                    ├── apiKeys/{keyId}
                    ├── config/ai
                    ├── conversations/{conversationId}
                    │       └── messages/{messageId}
                    └── analytics/{eventId}
```

Jika SADD v0.4 menggunakan struktur berbeda pada implementasi repository aktual, ikuti struktur SADD.

---

# 16. Repository Rules

Repository menerima `TenantContext`.

Contoh:

```typescript
projectRepository.getById(
  tenant.workspaceId,
  tenant.projectId
);
```

Jangan membuat generic method seperti:

```typescript
getProject(projectId)
```

yang memungkinkan caller lupa tenant scope.

---

# 17. API Key Design

API key:

```text
inf_pub_xxxxxxxxx
```

Karakteristik:

- client credential;
- project-scoped;
- boleh berada di Flutter app;
- tidak boleh mengakses LLM provider secara langsung;
- tidak boleh diperlakukan sebagai secret LLM.

Backend sebaiknya menyimpan:

```text
keyId
keyPrefix
keyHash
projectId
status
createdAt
lastUsedAt
```

Raw key:

```text
generate
  ↓
return once
  ↓
never log
```

---

# 18. API Key Validation

Flow:

```text
Request
  ↓
Read x-api-key
  ↓
Validate format
  ↓
Hash candidate key
  ↓
Find matching key
  ↓
Check status
  ↓
Resolve project
  ↓
Check project status
  ↓
TenantContext
```

Error generic:

```json
{
  "error": {
    "code": "INVALID_API_KEY",
    "message": "The provided API key is invalid."
  }
}
```

Jangan membocorkan apakah key pernah ada.

---

# 19. Runtime API

## 19.1. Chat

```http
POST /v1/runtime/chat
```

Headers:

```http
Content-Type: application/json
x-api-key: inf_pub_xxxxx
```

Request:

```json
{
  "projectId": "prj_demo",
  "sessionId": "sess_123",
  "message": "Bagaimana refund?"
}
```

Response message:

```json
{
  "requestId": "req_123",
  "type": "message",
  "data": {
    "content": "Produk dapat dikembalikan maksimal 7 hari."
  }
}
```

---

# 20. Runtime Input Validation

Validate:

```text
projectId
sessionId
message
```

Rules minimum:

```text
projectId: non-empty string
sessionId: non-empty string
message: non-empty string
```

Tambahkan maximum length untuk mencegah abuse.

Contoh:

```text
message <= 4000 chars
```

Nilai final harus dikonfigurasi, bukan hard-coded di berbagai tempat.

---

# 21. Runtime Chat Processing

Saat menerima:

```text
POST /v1/runtime/chat
```

jalankan:

```text
1. Validate headers
2. Authenticate API key
3. Resolve tenant
4. Validate project status
5. Validate request body
6. Create requestId
7. Load AI config
8. Load active functions
9. Retrieve relevant knowledge
10. Build normalized orchestration payload
11. Send to n8n
12. Validate n8n response
13. Handle event
14. Persist required runtime state
15. Log analytics
16. Return response
```

---

# 22. Normalized Orchestration Payload

Backend jangan meneruskan raw Flutter body ke n8n.

Gunakan normalized payload:

```json
{
  "requestId": "req_01J...",
  "project": {
    "id": "prj_demo"
  },
  "session": {
    "id": "sess_123"
  },
  "user": {
    "id": "user_987"
  },
  "ai": {
    "assistantName": "Mira",
    "role": "Customer Service",
    "language": "id",
    "tone": "friendly"
  },
  "knowledge": {
    "enabled": true,
    "context": [
      {
        "id": "chunk_1",
        "text": "Produk dapat dikembalikan..."
      }
    ]
  },
  "functions": [
    {
      "name": "check_order_status",
      "description": "Mengambil status pesanan",
      "parameters": {
        "type": "object"
      },
      "execution": {
        "type": "client_callback"
      }
    }
  ],
  "message": "Bagaimana refund?"
}
```

Jangan mengirim secret.

---

# 23. RAG Responsibilities

Backend / AI layer bertugas:

```text
Knowledge
    ↓
Chunk
    ↓
Embedding
    ↓
Vector retrieval
    ↓
Top-K
    ↓
Threshold
    ↓
Context
```

MVP:

```text
Firestore
```

sebagai metadata + vector store sesuai SADD.

---

# 24. RAG Query Policy

Jangan menganggap top result selalu relevan.

Gunakan:

```text
topK
threshold
```

Contoh:

```text
topK = 5
threshold = configured value
```

Flow:

```text
Query
 ↓
Embedding
 ↓
Vector Search
 ↓
Top-K
 ↓
Top score < threshold?
 ├── Yes → NO_RELEVANT_CONTEXT
 └── No  → Build Context
```

---

# 25. RAG Fallback

Jika tidak ditemukan context yang cukup:

```text
NO_RELEVANT_CONTEXT
```

AI tidak boleh dipaksa menjawab seolah-olah knowledge tersedia.

Fallback dapat berupa konfigurasi project:

```text
fallbackMessage
```

Contoh:

```text
"Informasi tersebut belum tersedia dalam knowledge base."
```

---

# 26. Knowledge Processing

Untuk operation publish/reindex:

```text
Knowledge
   ↓
Validate
   ↓
Chunk
   ↓
Generate Embedding
   ↓
Store chunks + embedding
   ↓
Update status
```

Status:

```text
draft
processing
ready
failed
archived
```

Operation embedding tidak boleh dilakukan di client.

---

# 27. Function Registry

Function adalah capability yang tersedia untuk AI.

Contoh:

```json
{
  "name": "check_order_status",
  "description": "Mengambil status pesanan berdasarkan order ID.",
  "status": "active",
  "execution": {
    "type": "client_callback"
  },
  "parameters": {
    "type": "object",
    "properties": {
      "orderId": {
        "type": "string"
      }
    },
    "required": ["orderId"]
  },
  "security": {
    "requiresConfirmation": false,
    "requiresAuthentication": true
  }
}
```

---

# 28. Function Calling Principle

Model tidak pernah memiliki hak langsung untuk mengeksekusi function.

Flow:

```text
LLM
 ↓
function_call
 ↓
Backend Function Policy
 ↓
Validate:
  - project
  - function exists
  - function active
  - arguments valid
  - security policy
 ↓
Flutter SDK
```

---

# 29. Runtime State Machine

Gunakan:

```text
CHAT_RECEIVED
      ↓
AI_PROCESSING
      ├── message → COMPLETED
      │
      └── function_call
             ↓
      FUNCTION_DISPATCHED
             ↓
      WAITING_CLIENT_RESULT
             ↓
      FUNCTION_RESULT_RECEIVED
             ↓
      AI_RESUMING
        ├── message → COMPLETED
        ├── function_call → FUNCTION_DISPATCHED
        └── error → FAILED
```

Backend tidak menahan request pertama sambil menunggu Flutter.

---

# 30. Function Call Response

Jika AI meminta function:

```json
{
  "requestId": "req_123",
  "type": "function_call",
  "data": {
    "function": "check_order_status",
    "arguments": {
      "orderId": "ORD123"
    }
  }
}
```

Backend harus memastikan response tidak mengandung internal secret atau internal workflow metadata.

---

# 31. Flutter Local Callback

SDK menerima event:

```text
function_call
```

Kemudian:

```text
function name
+
validated arguments
```

di-route ke callback lokal developer.

Contoh concept:

```dart
final infria = Infria(
  projectId: 'prj_demo',
  apiKey: 'inf_pub_xxx',
  functions: {
    'check_order_status': (args) async {
      return await orderService.getStatus(
        args['orderId'],
      );
    },
  },
);
```

Backend tidak mengetahui implementasi function lokal tersebut.

---

# 32. Function Result API

```http
POST /v1/runtime/function-result
```

Request:

```json
{
  "requestId": "req_123",
  "functionCallId": "fc_123",
  "function": {
    "name": "check_order_status",
    "arguments": {
      "orderId": "ORD123"
    }
  },
  "result": {
    "status": "shipped"
  }
}
```

Minimal identity:

```text
requestId
functionCallId
function.name
result
```

---

# 33. Function Result Validation

Backend harus memvalidasi:

```text
requestId exists
requestId belongs to project
functionCallId exists
functionCallId belongs to requestId
function name matches expected call
request is not expired
request is waiting for result
```

Jangan percaya function metadata yang dikirim ulang oleh client.

Contoh:

```text
Client says:
function = delete_user

Stored request says:
function = check_order_status

→ Reject
```

---

# 34. Function Result Idempotency

Function result dapat dikirim ulang karena network retry.

Gunakan:

```text
functionCallId
```

sebagai idempotency key.

Jika result sudah diproses:

```text
same functionCallId
    ↓
return known result / current request state
```

Jangan menjalankan ulang orchestration secara tidak sengaja.

---

# 35. Request Expiration

Runtime state yang menunggu client result harus punya expiry.

Contoh:

```text
createdAt
expiresAt
```

Jika:

```text
now > expiresAt
```

maka:

```text
WAITING_CLIENT_RESULT
    ↓
EXPIRED
```

Flutter yang mengirim result setelah expiry harus mendapat error terstruktur.

---

# 36. Resume Orchestration

Setelah valid function result:

```text
POST /function-result
      ↓
Validate request
      ↓
Load runtime state
      ↓
Validate function result
      ↓
Mark result accepted
      ↓
Resume n8n
      ↓
LLM finalization
      ↓
message / function_call
```

Jika n8n meminta function kedua:

```text
AI_RESUMING
    ↓
FUNCTION_DISPATCHED
    ↓
WAITING_CLIENT_RESULT
```

State machine boleh berulang.

---

# 37. Maximum Function Loop

Gunakan safety limit:

```text
MAX_FUNCTION_CALLS_PER_REQUEST
```

Contoh awal:

```text
5
```

Jika terlampaui:

```text
FUNCTION_CALL_LIMIT_EXCEEDED
```

Jangan biarkan loop AI berlangsung tanpa batas.

Nilai dapat dikonfigurasi kemudian.

---

# 38. n8n Adapter

Backend memiliki:

```text
N8nClient
N8nAdapter
```

Contoh interface:

```typescript
interface OrchestrationRequest {
  requestId: string;
  projectId: string;
  sessionId: string;
  aiConfig: AIConfig;
  context: RetrievalContext[];
  functions: ToolDefinition[];
  message: string;
}

interface OrchestrationResponse {
  requestId: string;
  type: "message" | "function_call" | "error";
  data: unknown;
}
```

Backend tidak bergantung pada detail node internal n8n.

---

# 39. n8n Boundary

n8n menerima:

```text
normalized orchestration payload
```

n8n tidak menerima:

```text
Firebase ID token
Firestore admin credentials
raw internal authorization context
LLM secrets from client
```

n8n juga tidak menjadi sumber kebenaran mengenai permission project.

---

# 40. n8n Workflow Responsibilities

Workflow n8n dapat melakukan:

```text
Receive normalized request
      ↓
Prepare prompt
      ↓
Use context
      ↓
Call LLM
      ↓
Interpret tool call
      ↓
Return structured event
```

Untuk runtime function callback:

```text
function_call
```

dikembalikan ke backend.

Backend mengirimkannya ke SDK.

---

# 41. n8n Secret

Backend → n8n harus memakai secret.

Contoh environment:

```env
N8N_BASE_URL=
N8N_RUNTIME_WEBHOOK=
N8N_SHARED_SECRET=
```

Secret tidak boleh berada:

```text
Flutter
Next.js client bundle
Firestore public document
```

---

# 42. LLM Secret

LLM credential berada server-side.

Model strategy:

```text
Project BYOK
    ↓
Server-side secret storage
    ↓
n8n / backend
```

Flutter tidak menerima:

```text
OPENAI_API_KEY
GEMINI_API_KEY
ANTHROPIC_API_KEY
```

---

# 43. Console Operations — Recommended Mapping

| Operation | Access |
|---|---|
| Project list | Direct Firestore |
| Project detail | Direct Firestore |
| Knowledge list | Direct Firestore |
| Knowledge detail | Direct Firestore |
| Function list | Direct Firestore |
| Function detail | Direct Firestore |
| AI config read | Direct Firestore |
| API key metadata | Direct Firestore |
| Project metadata CRUD | Direct Firestore if Rules-safe |
| Generate API key | Functions |
| Revoke API key | Functions if trusted operation required |
| Rotate API key | Functions |
| Publish knowledge | Functions |
| Reindex knowledge | Functions |
| Embedding | Functions |
| BYOK validation | Functions |
| Playground inference | Functions |
| Runtime chat | Functions |
| Function result | Functions |

---

# 44. Error Model

Gunakan consistent error envelope.

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "The request body is invalid.",
    "requestId": "req_123"
  }
}
```

Error code tidak boleh bergantung pada stack trace.

---

# 45. Error Categories

Minimum:

```text
INVALID_REQUEST
UNAUTHORIZED
FORBIDDEN
INVALID_API_KEY
PROJECT_NOT_FOUND
PROJECT_SUSPENDED
FUNCTION_NOT_FOUND
FUNCTION_DISABLED
INVALID_FUNCTION_ARGUMENTS
FUNCTION_CALL_EXPIRED
FUNCTION_RESULT_MISMATCH
FUNCTION_CALL_LIMIT_EXCEEDED
KNOWLEDGE_NOT_READY
NO_RELEVANT_CONTEXT
ORCHESTRATION_ERROR
AI_PROVIDER_ERROR
RATE_LIMITED
INTERNAL_ERROR
```

---

# 46. HTTP Status Mapping

Gunakan:

```text
400 → invalid request
401 → missing/invalid authentication
403 → authenticated but not allowed
404 → resource not found
409 → state conflict / idempotency conflict
422 → semantic validation failure
429 → rate limited
500 → internal error
502 → upstream provider failure
503 → temporary service unavailable
```

---

# 47. Logging

Setiap runtime request harus mempunyai:

```text
requestId
projectId
apiKeyId
sessionId
event type
latency
status
error code
```

Jangan log:

```text
API key
LLM API key
Authorization header
raw secret
full sensitive user payload
```

---

# 48. Analytics

Runtime analytics minimum:

```text
requestId
projectId
latencyMs
route
status
functionCalls
retrieval metadata
provider metadata
createdAt
```

Contoh:

```json
{
  "type": "ai_request",
  "requestId": "req_123",
  "latencyMs": 1832,
  "route": "rag",
  "retrieval": {
    "topScore": 0.91,
    "resultCount": 4
  },
  "llm": {
    "provider": "gemini"
  },
  "status": "success"
}
```

Jangan menjadikan analytics write sebagai alasan semua read Console harus lewat Functions.

---

# 49. Rate Limiting

Minimum boundary:

```text
Per API key
```

Optional:

```text
Per project
```

Runtime lebih penting untuk di-rate-limit dibanding read-only Console.

Gunakan configuration:

```env
RATE_LIMIT_RPM=60
```

Prototype boleh menggunakan in-memory mechanism hanya untuk development, tetapi production-safe distributed strategy perlu menjadi follow-up sebelum production scale.

---

# 50. Firestore Security

Untuk Direct Firestore Console access, Security Rules harus membatasi:

```text
authenticated user
    ↓
owned workspace
    ↓
project membership / ownership
```

Tidak boleh hanya:

```text
request.auth != null
```

karena semua user authenticated tidak berarti boleh membaca semua project.

---

# 51. Backend Authorization

Admin SDK bypasses Firestore Security Rules.

Karena itu:

```text
Function Request
    ↓
verify auth / API key
    ↓
resolve tenant
    ↓
authorize
    ↓
repository
```

Jangan mengandalkan Security Rules untuk authorization server-side.

---

# 52. Validation Strategy

Gunakan schema validation sebelum masuk service.

Contoh:

```text
HTTP body
    ↓
Zod schema
    ↓
typed input
    ↓
service
```

Runtime function arguments juga harus divalidasi terhadap Function Registry.

---

# 53. Function Argument Validation

Contoh registry:

```json
{
  "name": "check_order_status",
  "parameters": {
    "type": "object",
    "properties": {
      "orderId": {
        "type": "string"
      }
    },
    "required": ["orderId"]
  }
}
```

AI menghasilkan:

```json
{
  "orderId": 123
}
```

Backend:

```text
Expected string
Received number
```

→ reject function call.

Jangan meneruskan invalid argument ke Flutter.

---

# 54. Request Correlation

Gunakan:

```text
requestId
```

untuk seluruh chain:

```text
Flutter
 ↓
Functions
 ↓
n8n
 ↓
LLM
 ↓
function_call
 ↓
Flutter
 ↓
function-result
 ↓
Functions
 ↓
n8n
 ↓
LLM
```

Jangan membuat correlation identifier baru setiap tahap.

---

# 55. Runtime State Storage

Minimal state yang perlu dipertahankan ketika ada function call:

```json
{
  "requestId": "req_123",
  "projectId": "prj_demo",
  "sessionId": "sess_123",
  "status": "waiting_client_result",
  "functionCallId": "fc_123",
  "functionName": "check_order_status",
  "createdAt": "timestamp",
  "expiresAt": "timestamp"
}
```

Storage dapat menggunakan Firestore sesuai SADD.

Jangan menyimpan raw secret di runtime state.

---

# 56. Runtime Concurrency

Backend harus memperhatikan kemungkinan:

```text
function-result dikirim dua kali
```

atau:

```text
dua callback masuk bersamaan
```

Gunakan transaction / atomic update untuk transition:

```text
WAITING_CLIENT_RESULT
        ↓
FUNCTION_RESULT_RECEIVED
```

hanya boleh terjadi sekali.

---

# 57. Chat Conversation Storage

Raw conversation storage dianggap opsional pada MVP.

Prioritas:

```text
request metadata
analytics
runtime state
```

Jika conversation persistence diaktifkan:

```text
/project/{projectId}/conversations/{conversationId}
```

tetap tenant-scoped.

---

# 58. Health Endpoint

Tambahkan:

```http
GET /health
```

Response:

```json
{
  "status": "ok"
}
```

Endpoint ini tidak boleh membocorkan:

```text
environment secrets
provider credentials
Firestore credentials
n8n credentials
```

---

# 59. Configuration

Gunakan typed environment configuration.

Contoh:

```env
NODE_ENV=development

FIREBASE_PROJECT_ID=infria-e1260

N8N_BASE_URL=
N8N_RUNTIME_WEBHOOK=
N8N_SHARED_SECRET=

OPENAI_API_KEY=
GEMINI_API_KEY=
ANTHROPIC_API_KEY=

RATE_LIMIT_RPM=60
RUNTIME_FUNCTION_TIMEOUT_SECONDS=120
MAX_FUNCTION_CALLS_PER_REQUEST=5
```

Nilai actual production jangan commit ke repository.

---

# 60. Local Development

Target:

```text
Next.js Console
        ↓
Firebase Emulator / Dev Firebase
        ↓
Cloud Functions
        ↓
Firestore
        ↓
n8n dev workflow
```

Commands minimal:

```bash
npm install
npm run build
npm run lint
npm run test
firebase emulators:start
```

---

# 61. Implementation Order

Jangan langsung mengerjakan semuanya.

Urutan wajib:

## Phase 1 — Backend Skeleton

```text
1. Firebase Functions init
2. Express setup
3. TypeScript
4. Environment config
5. Error handler
6. Request ID
7. /health
```

Acceptance:

```text
GET /health → 200
```

---

## Phase 2 — Authentication + Project Trust

```text
1. Firebase Admin SDK
2. Firebase ID Token middleware
3. API key middleware
4. Tenant resolver
5. Project status validation
```

Acceptance:

```text
valid token → authorized
invalid token → rejected

valid API key → project resolved
invalid API key → rejected
```

---

## Phase 3 — Runtime Chat Skeleton

Implement:

```http
POST /v1/runtime/chat
```

Flow:

```text
SDK request
 ↓
API key
 ↓
tenant
 ↓
AI config
 ↓
functions
 ↓
mock orchestration adapter
 ↓
response
```

Jangan implement RAG dulu.

Acceptance:

```text
Flutter / Postman
    ↓
runtime/chat
    ↓
message response
```

---

## Phase 4 — n8n Integration

Implement:

```text
N8nClient
N8nAdapter
OrchestrationService
```

Flow:

```text
runtime/chat
 ↓
n8n
 ↓
LLM
 ↓
message
```

Acceptance:

```text
real LLM response
```

---

## Phase 5 — Function Calling

Implement:

```text
function registry load
function policy
function call validation
function-call event
runtime state
function-result endpoint
resume orchestration
```

Acceptance:

```text
User
 ↓
AI asks function
 ↓
Flutter callback
 ↓
function-result
 ↓
AI final response
```

Ini adalah milestone paling penting setelah basic chat.

---

## Phase 6 — RAG

Implement:

```text
chunker
embedding
vector storage
retrieval
threshold
context builder
```

Acceptance:

```text
relevant knowledge → grounded answer

irrelevant question
→ fallback
```

---

## Phase 7 — Knowledge Processing

Implement:

```text
publish
processing
embedding
ready
failed
reindex
```

Acceptance:

```text
Console publish
 ↓
Functions
 ↓
embedding
 ↓
ready
```

---

## Phase 8 — API Key Operations

Implement:

```text
create
revoke
rotate
```

Acceptance:

```text
old key invalid after revoke/rotate
new key works
```

---

## Phase 9 — Analytics

Implement:

```text
runtime event
latency
route
status
function count
retrieval metadata
```

Acceptance:

```text
real runtime traffic appears in analytics
```

---

# 62. MVP Vertical Slice

Sebelum mengerjakan feature lain, backend harus bisa menyelesaikan:

```text
Flutter SDK
   ↓
POST /v1/runtime/chat
   ↓
API Key Validation
   ↓
Project Resolution
   ↓
Load AI Config
   ↓
Load Functions
   ↓
n8n
   ↓
LLM
   ↓
message
   ↓
Flutter
```

Kemudian:

```text
function_call
   ↓
Flutter Callback
   ↓
function-result
   ↓
n8n resume
   ↓
final response
```

Ini adalah **core backend proof** INFRIA.

---

# 63. Testing Strategy

## Unit Tests

Prioritas:

```text
API key validation
tenant resolution
function policy
argument validation
runtime state transition
error mapping
idempotency
```

## Integration Tests

Prioritas:

```text
runtime/chat
runtime/function-result
Firestore repository
n8n adapter
```

## End-to-End

Minimal:

```text
Flutter / test client
 ↓
Functions
 ↓
n8n
 ↓
LLM
 ↓
function callback simulation
 ↓
final response
```

---

# 64. Required Backend Test Cases

### Authentication

```text
[ ] missing API key
[ ] malformed API key
[ ] invalid API key
[ ] revoked API key
[ ] suspended project
```

### Function Calling

```text
[ ] registered function
[ ] unregistered function
[ ] disabled function
[ ] invalid arguments
[ ] mismatched function-result
[ ] duplicate function-result
[ ] expired function call
[ ] function call loop exceeded
```

### RAG

```text
[ ] relevant context
[ ] below threshold
[ ] empty knowledge base
[ ] processing knowledge
[ ] cross-project retrieval attempt
```

### Security

```text
[ ] cross-project projectId mismatch
[ ] cross-tenant function
[ ] LLM secret not exposed
[ ] API key not logged
```

---

# 65. Cross-Tenant Security Test

Scenario:

```text
API Key A
→ Project A
```

Request attempts:

```text
projectId = Project B
```

Expected:

```text
backend ignores client claim
→ resolves Project A
→ rejects mismatch
```

Do not query Project B data before authorization.

---

# 66. Cross-Tenant RAG Test

Scenario:

```text
Project A
Knowledge:
"Refund A"
```

```text
Project B
Knowledge:
"Refund B"
```

Query from Project A:

```text
"Bagaimana refund?"
```

Expected:

```text
only Project A chunks
```

No retrieval from Project B is allowed.

---

# 67. API Response Contract

Gunakan stable envelope:

```json
{
  "requestId": "req_123",
  "type": "message",
  "data": {}
}
```

Runtime event types MVP:

```text
message
function_call
error
```

Future:

```text
stream_start
stream_delta
stream_end
function_result
```

Jangan implement streaming hanya karena type sudah disiapkan.

---

# 68. Function Result Contract

Input:

```json
{
  "requestId": "req_123",
  "functionCallId": "fc_123",
  "function": {
    "name": "check_order_status",
    "arguments": {
      "orderId": "ORD123"
    }
  },
  "result": {
    "status": "shipped"
  }
}
```

Response final:

```json
{
  "requestId": "req_123",
  "type": "message",
  "data": {
    "content": "Pesanan ORD123 sedang dalam pengiriman."
  }
}
```

---

# 69. What Antigravity Should Build First

Jangan membuat seluruh backend sekaligus.

Urutan:

```text
STEP 1
functions skeleton

STEP 2
Express + /health

STEP 3
Firebase Admin

STEP 4
API key validation

STEP 5
TenantContext

STEP 6
/v1/runtime/chat

STEP 7
Mock orchestration

STEP 8
n8n adapter

STEP 9
real LLM workflow

STEP 10
function_call state

STEP 11
/function-result

STEP 12
resume orchestration

STEP 13
RAG

STEP 14
knowledge processing

STEP 15
analytics
```

---

# 70. Anti-Pattern Checklist

Antigravity harus menghentikan implementasi jika menemukan pola berikut:

```text
[ ] Next.js → Function → Firestore untuk semua GET
[ ] Flutter → n8n direct
[ ] Flutter → LLM direct
[ ] LLM key di Flutter
[ ] API key raw dilog
[ ] projectId dianggap trustworthy
[ ] function call langsung dieksekusi tanpa policy
[ ] HTTP request ditahan menunggu callback Flutter
[ ] n8n menentukan authorization
[ ] repository tanpa tenant context
[ ] cross-project Firestore query
[ ] infinite function loop
[ ] duplicate function result mengulangi execution
```

---

# 71. Definition of Done — Backend Foundation

Backend foundation dianggap selesai ketika:

```text
[ ] Firebase Functions deployed
[ ] Express API running
[ ] /health works
[ ] environment config typed
[ ] centralized error handling
[ ] requestId generated
[ ] API key validation works
[ ] tenant context works
[ ] project status validated
[ ] /v1/runtime/chat works
[ ] n8n adapter works
[ ] message response works
```

---

# 72. Definition of Done — Function Calling

```text
[ ] function registry loaded
[ ] function policy enforced
[ ] LLM function_call parsed
[ ] function_call returned to SDK
[ ] runtime state persisted
[ ] function-result endpoint works
[ ] function result validated
[ ] idempotency works
[ ] request expiry works
[ ] n8n resumes
[ ] final answer returned
[ ] multi-function loop protected
```

---

# 73. Definition of Done — RAG

```text
[ ] text chunking
[ ] embeddings
[ ] vector storage
[ ] project-scoped retrieval
[ ] top-K
[ ] threshold
[ ] context builder
[ ] grounded response
[ ] no-context fallback
[ ] knowledge lifecycle
[ ] reindex
```

---

# 74. Definition of Done — Console Integration

Backend tidak dianggap terintegrasi dengan Console hanya karena endpoint tersedia.

Harus ada:

```text
Console
 ↓
Direct Firestore
```

untuk read/safe CRUD yang sesuai.

Dan:

```text
Console
 ↓
Firebase Functions
```

untuk operation privileged.

Target:

```text
No unnecessary Function invocation.
```

---

# 75. Final Backend Principle

> **INFRIA Backend adalah trusted runtime gateway, bukan proxy Firestore.**

Dan:

> **INFRIA tidak menjalankan business logic aplikasi developer. INFRIA menjalankan AI orchestration dan mengembalikan function command untuk dieksekusi oleh aplikasi developer melalui Flutter SDK.**

Final relationship:

```text
Web Console
    ↓
Configure

Firebase Functions
    ↓
Trust + Runtime

n8n
    ↓
Orchestration

LLM
    ↓
Reasoning / Generation

Flutter SDK
    ↓
Integration + Local Function Execution

Developer App
    ↓
Business Logic
```

Ini adalah boundary yang harus dipertahankan sepanjang implementasi MVP.

---

# 76. Implementation Rule for AI Coding Agent

Saat mulai coding:

1. Baca `INFRIA-SADD-v0.4-Locked.md`.
2. Baca dokumen ini sampai selesai.
3. Inspect repository FE yang sudah ada.
4. Jangan merombak FE.
5. Buat `functions/` secara modular.
6. Implementasikan Phase 1 terlebih dahulu.
7. Setelah setiap milestone, jalankan test.
8. Jangan membuat mock yang terlihat seperti production behavior jika contract belum ada.
9. Jika ada kebutuhan yang bertentangan dengan SADD, jangan mengubah arsitektur diam-diam.
10. Dokumentasikan perubahan sebagai ADR.

Target pertama bukan "backend lengkap".

Target pertama adalah:

```text
Flutter/Test Client
      ↓
/v1/runtime/chat
      ↓
Firebase Functions
      ↓
n8n
      ↓
LLM
      ↓
message
```

Setelah core loop ini stabil, lanjutkan ke:

```text
function_call
      ↓
Flutter callback
      ↓
function-result
      ↓
resume
      ↓
final answer
```

Barulah RAG dan feature pendukung lain diperluas.

---

# END OF DOCUMENT
