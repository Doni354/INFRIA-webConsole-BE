# INFRIA Web Console — Product & Prototype Blueprint

**Document:** INFRIA-CONSOLE-001  
**Version:** 1.0  
**Audience:** AI coding agent / Antigravity / frontend engineer / product designer  
**Purpose:** menjadi sumber instruksi utama untuk membangun prototype Web Console INFRIA.

---

# 1. What is INFRIA Console?

INFRIA Console adalah **developer control plane** untuk produk INFRIA.

Cara paling mudah memahami produknya:

> **INFRIA Console untuk AI infrastructure kurang lebih seperti Firebase Console untuk Firebase, atau Cloudflare Dashboard untuk Cloudflare.**

Developer datang ke Console bukan untuk menggunakan chatbot sebagai end user, tetapi untuk **membangun, mengonfigurasi, menguji, dan menghubungkan project aplikasi mereka dengan layanan AI INFRIA**.

Console adalah tempat developer melakukan:

```text
Login
  ↓
Workspace
  ↓
Create Project
  ↓
Configure AI
  ↓
Add Knowledge
  ↓
Register Functions
  ↓
Get API Key
  ↓
Integrate Flutter SDK
  ↓
Test / Observe Runtime
```

INFRIA Console harus terasa sebagai **platform developer**, bukan sebagai website SaaS biasa.

---

# 2. Product Mental Model

Gunakan mental model berikut:

```text
Firebase
├── Project
├── APIs
├── Authentication
├── Firestore
├── Configuration
└── SDK Integration

Cloudflare
├── Account
├── Projects / Sites
├── Configuration
├── API Tokens
├── Analytics
└── Developer Tools

INFRIA
├── Workspace
├── Projects
├── Knowledge
├── Functions
├── AI Configuration
├── API Keys
├── SDK Integration
└── Runtime Analytics
```

INFRIA tidak meniru tampilan Firebase atau Cloudflare secara literal.

Yang diambil adalah **product pattern**:

- resource-oriented navigation;
- project-centric management;
- persistent sidebar;
- clear environment/project context;
- configuration pages;
- generated credentials;
- setup instructions;
- observable runtime state.

---

# 3. Primary User

Primary user adalah:

> **Developer yang ingin menambahkan kemampuan AI ke aplikasi Flutter tanpa membangun seluruh AI infrastructure sendiri.**

User bukan end-user chatbot.

User Console memiliki pola pikir:

```text
"Bagaimana cara saya membuat project?"
"Knowledge apa yang dipakai AI?"
"Function apa yang boleh dipanggil AI?"
"Bagaimana SDK saya terhubung?"
"Apakah project saya aktif?"
"Apakah request AI berjalan?"
```

---

# 4. Product Personality

Console harus terasa:

- technical;
- reliable;
- clean;
- modern;
- developer-first;
- focused;
- tidak terlalu dekoratif;
- tidak seperti admin panel CRUD biasa.

Visual direction:

```text
Modern Developer Platform
+
Cloud Infrastructure Dashboard
+
AI Configuration Console
```

Jangan membuat:

- dashboard dengan terlalu banyak card;
- grafik dekoratif tanpa fungsi;
- fake AI visual;
- gradient berlebihan;
- sidebar penuh menu yang belum punya fungsi;
- halaman marketing di dalam console.

---

# 5. Main UX Principle

Console harus selalu menjawab tiga hal:

### Where am I?

```text
Workspace
→ Project
→ Current Resource
```

### What can I do?

```text
Configure
Create
Test
Integrate
Observe
```

### What should I do next?

Setiap halaman penting memiliki CTA yang jelas.

Contoh:

```text
Project baru
→ Add Knowledge
→ Add Function
→ Integrate SDK
```

---

# 6. Information Architecture

Gunakan struktur utama:

```text
INFRIA Console
│
├── Dashboard
│
├── Projects
│   ├── All Projects
│   └── Project Detail
│
└── Account
    └── Personal Workspace
```

Saat project aktif:

```text
Project
│
├── Overview
├── Knowledge
├── Functions
├── AI Configuration
├── SDK & API Keys
└── Analytics
```

Menu project hanya muncul ketika developer sudah memilih project.

---

# 7. Global Layout

Target layout:

```text
┌──────────────────────────────────────────────────────────────┐
│ INFRIA                                      User / Workspace │
├───────────────┬──────────────────────────────────────────────┤
│               │                                              │
│ Dashboard     │                                              │
│ Projects      │                Main Content                  │
│               │                                              │
│               │                                              │
│ ───────────   │                                              │
│ Account       │                                              │
│               │                                              │
└───────────────┴──────────────────────────────────────────────┘
```

Untuk project detail:

```text
┌──────────────────────────────────────────────────────────────┐
│ INFRIA / Demo Store                           Workspace ▼     │
├───────────────┬──────────────────────────────────────────────┤
│ Project       │                                              │
│ ─────────     │                                              │
│ Overview      │              Project Content                │
│ Knowledge     │                                              │
│ Functions     │                                              │
│ AI Config     │                                              │
│ SDK & Keys    │                                              │
│ Analytics     │                                              │
└───────────────┴──────────────────────────────────────────────┘
```

---

# 8. Authentication

## 8.1 Login Page

Prototype hanya memerlukan:

```text
INFRIA

AI Infrastructure for Mobile Applications

[ Continue with Google ]
```

Supporting copy:

```text
Build AI-powered experiences into your Flutter application.
```

Jangan menyediakan email/password pada prototype jika belum diperlukan.

---

# 9. Personal Workspace

Setelah Google Login:

```text
Firebase UID
      ↓
Personal Workspace
      ↓
Dashboard
```

User tidak perlu memilih organization pada prototype.

Contoh:

```text
Doni's Workspace
```

Workspace selector tetap dapat ditampilkan pada header sebagai extension point masa depan.

---

# 10. Dashboard

Dashboard adalah **home developer**, bukan analytics BI.

Tujuan:

> memberi status cepat terhadap project dan membantu developer melanjutkan pekerjaan.

Contoh:

```text
Good afternoon, Doni

Workspace
Doni's Workspace

Projects
┌──────────────────────┐
│ Demo Store           │
│ Flutter              │
│ Active               │
└──────────────────────┘

┌──────────────────────┐
│ Health Assistant     │
│ Flutter              │
│ Active               │
└──────────────────────┘

Recent Activity
• Knowledge updated
• API key created
• Function registered
```

Primary CTA:

```text
[ Create Project ]
```

---

# 11. Project List

Route:

```text
/projects
```

Tampilan utama berupa table/list.

Columns:

```text
Project
Platform
Status
Knowledge
Functions
Last Activity
```

Contoh:

```text
Demo Store
Flutter
Active
12
4
2 min ago
```

Actions:

```text
Open
```

Jangan menampilkan terlalu banyak metadata.

---

# 12. Create Project

Route:

```text
/projects/new
```

Form minimum:

```text
Project Name
```

Optional:

```text
Description
```

Platform:

```text
Flutter
```

CTA:

```text
[ Create Project ]
```

Setelah berhasil:

```text
Project Created

Project ID:
infria-demo-store-7f42

Public API Key:
infria_pk_xxxxxxxxx

[ Copy API Key ]
[ Go to Project ]
```

API key hanya ditampilkan pada creation/rotation flow sesuai backend contract.

---

# 13. Project Overview

Route:

```text
/projects/[projectId]
```

Header:

```text
Demo Store
Flutter
Active
```

Metadata:

```text
Project ID
Created
SDK Version
API Key Status
```

Primary CTAs:

```text
[ Add Knowledge ]
[ Add Function ]
[ Integrate SDK ]
```

---

# 14. Overview Status Model

Project overview menampilkan readiness.

Contoh:

```text
Project Setup

✓ Project created
✓ AI configuration
✓ Knowledge ready
○ Function integration
○ SDK integration
```

Tujuan visual ini adalah membantu developer tahu apa yang harus dilakukan berikutnya.

---

# 15. Knowledge Page

Route:

```text
/projects/[projectId]/knowledge
```

Tujuan:

> mengelola sumber pengetahuan yang digunakan AI melalui RAG.

List:

```text
Knowledge
├── Return Policy
├── Shipping FAQ
├── Payment FAQ
└── Store Information
```

Column:

```text
Title
Category
Status
Chunks
Updated
```

Status:

```text
Draft
Processing
Ready
Failed
Archived
```

Primary CTA:

```text
[ Add Knowledge ]
```

---

# 16. Create Knowledge

Form:

```text
Title
Category
Content
```

Example:

```text
Title:
Return Policy

Category:
Refund

Content:
Produk dapat dikembalikan maksimal 7 hari...
```

Action:

```text
[ Save Draft ]
[ Publish ]
```

Setelah publish:

```text
Draft
  ↓
Processing
  ↓
Ready
```

UI harus memperlihatkan processing state.

---

# 17. Knowledge Detail

Detail page menampilkan:

```text
Title
Category
Status
Created By
Updated
Chunk Count
Indexing Status
```

Actions:

```text
Edit
Reindex
Archive
Delete
```

Tidak perlu membuat visualisasi vector embedding pada prototype.

Developer tidak perlu melihat embedding mentah.

---

# 18. Functions Page

Route:

```text
/projects/[projectId]/functions
```

Tujuan:

> mendefinisikan capability yang dapat digunakan AI melalui Dynamic Function Calling.

Example:

```text
check_order_status
get_appointment
cancel_order
```

Table:

```text
Function
Description
Execution
Auth
Confirmation
Status
```

---

# 19. Create Function

Form:

```text
Function Name
Description
Parameters
Execution Type
Requires Authentication
Requires Confirmation
```

MVP execution:

```text
Client Callback
```

Example:

```json
{
  "name": "check_order_status",
  "description": "Mengambil status pesanan",
  "parameters": {
    "type": "object",
    "properties": {
      "orderId": {
        "type": "string"
      }
    },
    "required": ["orderId"]
  },
  "execution": {
    "type": "client_callback"
  }
}
```

UI parameter editor boleh berupa JSON editor sederhana pada prototype.

---

# 20. Function Detail

Tampilkan:

```text
Function
check_order_status

Description
Mengambil status pesanan berdasarkan order ID.

Execution
Client Callback

Authentication
Required

Confirmation
Not Required
```

Generated SDK example:

```dart
infria.registerFunction(
  'check_order_status',
  (args) async {
    return await orderService.getStatus(
      args['orderId'],
    );
  },
);
```

Tujuannya agar developer langsung mengerti hubungan Console → SDK.

---

# 21. AI Configuration Page

Route:

```text
/projects/[projectId]/ai
```

Tujuan:

> mengatur perilaku AI pada project.

Fields:

```text
Assistant Name
Role
Language
Tone
System Instructions
Fallback Message
Retrieval Top-K
Retrieval Threshold
```

Example:

```text
Assistant Name
Mira

Role
Customer Service

Language
Indonesian

Tone
Friendly
```

Section tambahan:

```text
Knowledge
✓ Enabled

Function Calling
✓ Enabled
```

---

# 22. SDK & API Keys

Route:

```text
/projects/[projectId]/sdk
```

Halaman ini sangat penting.

Tujuannya:

> membuat developer dapat mengambil credential dan langsung mengintegrasikan SDK.

---

# 23. SDK Integration UI

Tampilan ideal:

```text
Install INFRIA

flutter pub add infria_sdk
```

Lalu:

```dart
final infria = Infria(
  projectId: 'infria-demo-store-7f42',
  apiKey: 'infria_pk_xxxxx',
);
```

Lalu:

```dart
InfriaChat(
  client: infria,
);
```

Setiap code block memiliki:

```text
[ Copy ]
```

---

# 24. API Key Management

Section:

```text
Public API Keys
```

Table:

```text
Name
Prefix
Status
Created
Last Used
```

Actions:

```text
Create Key
Revoke
Rotate
```

Warning:

```text
Public API keys identify your project.
Do not use them as a replacement for server-side secrets.
```

Jangan menampilkan LLM secret.

---

# 25. Analytics Page

Route:

```text
/projects/[projectId]/analytics
```

Prototype cukup menampilkan operational metrics:

```text
Total Requests
Successful Requests
Failed Requests
Function Calls
Fallbacks
Average Latency
```

Tambahkan latest activity:

```text
12:42:11
POST /v1/runtime/chat
Success
1.2s

12:41:54
Function Call
check_order_status
Success
```

Jangan membangun BI kompleks.

---

# 26. Runtime Test / Playground

Prototype sangat disarankan memiliki fitur test sederhana.

Lokasi:

```text
Project Overview
```

atau:

```text
Analytics
```

Tujuan:

> developer dapat menguji konfigurasi AI tanpa harus langsung menjalankan aplikasi Flutter.

Contoh:

```text
INFRIA Playground

Ask something...

[ Send ]
```

Response:

```text
AI Response
```

Metadata kecil:

```text
Route: RAG
Latency: 1.24s
Sources: 3
```

Untuk Function Calling:

```text
Function Call
check_order_status

Arguments
{
  "orderId": "ORD123"
}
```

Playground menjadi alat demo internal, bukan end-user chat product.

---

# 27. Empty States

Jangan menampilkan halaman kosong.

Contoh Project:

```text
No projects yet.

Create your first INFRIA project to start building.

[ Create Project ]
```

Knowledge:

```text
No knowledge sources yet.

Add your first knowledge source to ground AI responses.

[ Add Knowledge ]
```

Functions:

```text
No functions registered.

Connect your application logic to AI with Dynamic Function Calling.

[ Add Function ]
```

Analytics:

```text
No runtime activity yet.

Integrate the SDK and send your first request.
```

---

# 28. Error States

Setiap operation harus punya state:

```text
Loading
Success
Error
Empty
Processing
```

Contoh error:

```text
Unable to create project.

Please try again.
```

Untuk technical error:

```text
Request ID:
req_123
```

Jangan menampilkan stack trace ke user.

---

# 29. Navigation Rules

Global navigation:

```text
Dashboard
Projects
```

Project navigation:

```text
Overview
Knowledge
Functions
AI Configuration
SDK & API Keys
Analytics
```

Account:

```text
Personal Workspace
Google Account
Sign Out
```

Jangan membuat menu:

```text
Billing
Teams
Marketplace
Integrations
Logs
Secrets
Models
Deployments
```

sebelum functionality-nya benar-benar diperlukan.

---

# 30. Responsive Behavior

Target utama:

```text
Desktop / Laptop
```

karena user utama adalah developer.

Minimum supported:

```text
1280px desktop
```

Tablet dapat tetap usable.

Mobile tidak menjadi priority utama untuk Web Console.

---

# 31. Design System Direction

Gunakan design language ala developer platform modern.

Characteristic:

```text
Dense but readable
Clear hierarchy
Consistent spacing
Subtle borders
Minimal shadows
Strong typography
Predictable controls
```

Prefer:

```text
Table
Tabs
Breadcrumb
Cards only where useful
Code blocks
Badges
Forms
Side navigation
Toast
Dialog
```

Hindari:

```text
Huge hero sections
Marketing gradients
Floating glassmorphism everywhere
Excessive illustration
Animated dashboard widgets
```

---

# 32. Suggested Color Strategy

Primary:

```text
Neutral / dark developer-console base
+
single INFRIA accent
```

Status:

```text
success
warning
error
info
```

Gunakan warna status secara semantic.

Jangan memakai warna berbeda untuk dekorasi.

---

# 33. Frontend Architecture

Recommended:

```text
Next.js
TypeScript
Tailwind CSS
Firebase Web SDK
```

Suggested structure:

```text
app/
├── login/
├── dashboard/
├── projects/
│   ├── page.tsx
│   ├── new/
│   └── [projectId]/
│       ├── page.tsx
│       ├── knowledge/
│       ├── functions/
│       ├── ai/
│       ├── sdk/
│       └── analytics/
├── layout.tsx
└── page.tsx
```

Components:

```text
components/
├── layout/
├── navigation/
├── project/
├── knowledge/
├── functions/
├── ai/
├── sdk/
├── analytics/
└── ui/
```

---

# 34. Backend Integration

Console tidak boleh membaca semua Firestore data secara bebas.

Preferred flow:

```text
Next.js Console
      ↓
Firebase Auth
      ↓
Firebase ID Token
      ↓
INFRIA Backend
      ↓
Cloud Functions
      ↓
Firestore
```

Untuk Console:

```text
GET /v1/console/projects
POST /v1/console/projects
...
```

Gunakan API contract dari SADD.

---

# 35. Frontend State

Minimal state:

```text
auth state
workspace
selected project
loading
error
resource list
resource detail
```

Selected project harus persist secara jelas melalui routing.

Contoh:

```text
/projects/infria-demo-store-7f42/knowledge
```

Project context tidak boleh hanya disimpan di browser state.

---

# 36. API Integration Rules

Frontend service layer:

```text
services/
├── auth.service.ts
├── workspace.service.ts
├── project.service.ts
├── knowledge.service.ts
├── function.service.ts
├── ai.service.ts
├── sdk.service.ts
└── analytics.service.ts
```

UI tidak boleh langsung melakukan fetch terhadap arbitrary endpoint.

Contoh:

```text
Page
 ↓
Service
 ↓
API Client
 ↓
Backend
```

---

# 37. Authentication Rules

Use Firebase Authentication for Google Login.

Frontend:

```text
Google Sign-In
↓
Firebase User
↓
Get ID Token
```

API client:

```http
Authorization: Bearer <Firebase ID Token>
```

Backend tetap melakukan verification.

---

# 38. Project API Rules

Create project:

```http
POST /v1/console/projects
```

Request:

```json
{
  "name": "Demo Store",
  "platform": "flutter"
}
```

Response:

```json
{
  "projectId": "infria-demo-store-7f42",
  "name": "Demo Store",
  "publicApiKey": "infria_pk_xxxxx"
}
```

---

# 39. Prototype Functional Priority

## P0 — Must Work

```text
Google Login
Personal Workspace
Dashboard
Project List
Create Project
Project Detail
API Key
SDK Setup
```

## P1 — Core AI Configuration

```text
Knowledge CRUD
Function CRUD
AI Configuration
Playground
```

## P2 — Observability

```text
Analytics
Activity
Request history
```

## P3 — Future

```text
Teams
Billing
Multiple workspaces
Advanced secrets
Provider management
CLI
Marketplace
```

---

# 40. Golden Path UI

Prototype harus memungkinkan flow:

```text
Login with Google
      ↓
Dashboard
      ↓
Create Project
      ↓
Project Overview
      ↓
Add Knowledge
      ↓
Add Function
      ↓
Configure AI
      ↓
SDK & API Keys
      ↓
Copy Flutter Setup
      ↓
Playground / Runtime Test
```

Developer harus selalu tahu langkah berikutnya.

---

# 41. Prototype Definition of Done

Web Console prototype dinyatakan berhasil apabila:

```text
[ ] Google Login bekerja
[ ] Personal Workspace terbentuk
[ ] Dashboard tampil
[ ] Project dapat dibuat
[ ] Project ID dibuat
[ ] Public API Key dibuat
[ ] Project detail tampil
[ ] Knowledge dapat dibuat
[ ] Function dapat dibuat
[ ] AI configuration dapat diubah
[ ] SDK snippet dapat ditampilkan
[ ] API key dapat di-copy
[ ] Playground dapat digunakan
[ ] Analytics basic dapat ditampilkan
[ ] Loading/error/empty state tersedia
[ ] Tidak ada data dummy yang seolah-olah live
```

---

# 42. Important AI Coding Instructions

Saat membangun prototype:

### 1. Prioritaskan functional surface

Jangan menghabiskan effort pada visual sebelum flow utama bekerja.

### 2. Jangan membuat fitur fiktif

Jika backend belum tersedia, gunakan explicit mock layer dengan nama yang jelas.

Jangan membuat UI berpura-pura berhasil melakukan operation yang belum tersedia.

### 3. Keep architecture replaceable

Mock:

```text
Mock Project Service
```

harus dapat diganti menjadi:

```text
Real Project Service
```

tanpa mengubah page architecture secara besar.

### 4. Follow SADD contract

Runtime API, project model, function model, knowledge lifecycle, API key model, dan authentication boundary harus mengikuti:

```text
INFRIA-SADD-v0.3.1-Updated.md
```

### 5. Product before polish

Urutan:

```text
Information Architecture
↓
Navigation
↓
Page states
↓
Data model
↓
API integration
↓
Interactions
↓
Visual polish
```

---

# 43. What the Prototype Should Feel Like

Saat developer membuka INFRIA Console, mereka harus langsung memahami:

> "Ini tempat gue bikin project AI, ngasih knowledge ke AI, daftarin function yang boleh dipanggil AI, lalu ambil credential dan connect ke Flutter SDK."

Bukan:

> "Ini dashboard analytics dengan banyak card."

Produk harus terasa seperti **developer infrastructure platform**.

---

# 44. Final Product Loop

```text
                  INFRIA CONSOLE

 Google Login
      ↓
 Personal Workspace
      ↓
 Create Project
      ↓
 ┌─────────────────────────────────────┐
 │ Project                              │
 │                                     │
 │ Knowledge → RAG                     │
 │ Functions → Dynamic Function Call  │
 │ AI Config → Assistant behavior      │
 │ SDK & API Keys → Integration        │
 │ Analytics → Runtime visibility      │
 └─────────────────────────────────────┘
      ↓
 Flutter SDK
      ↓
 Developer Application
      ↓
 End User
```

INFRIA Console adalah **control plane** yang menghubungkan developer dengan AI infrastructure INFRIA.

---

# 45. Non-Goals

Prototype tidak perlu:

- billing;
- organization management kompleks;
- team invitation;
- advanced RBAC;
- enterprise SSO;
- full API marketplace;
- visual n8n workflow editor;
- vector database management UI;
- model training UI;
- voice AI;
- multimodal configuration.

Jangan menambahkan halaman hanya karena platform seperti Firebase atau Cloudflare memilikinya.

Setiap halaman harus punya fungsi terhadap golden path INFRIA.
