# INFRIA n8n Integration Spec
**Untuk: Tim n8n Workflow**  
**Versi:** 1.0  
**Tanggal:** 2025  
**Dibuat oleh:** INFRIA Console Team

---

## Overview

Dokumen ini berisi spesifikasi teknis yang harus diimplementasikan di sisi **n8n workflow** agar fitur-fitur berikut berfungsi di INFRIA Console:

1. Penyimpanan sesi chat ke **Firestore** (bukan n8n memory)
2. Pencatatan **analytics events** ke Firestore setelah setiap request
3. **Validasi App Registration** (Connected App) saat ada request dari Flutter SDK

---

## Mengapa Harus Simpan ke Firestore, Bukan n8n Memory?

> **PENTING**: Jangan simpan data sesi/chat ke memory node n8n (`Set`, `Static Data`, atau workflow context).

| | n8n Memory | Firestore |
|--|--|--|
| **Persist setelah restart?** | ❌ Hilang | ✅ Permanent |
| **Bisa diakses Console?** | ❌ Tidak | ✅ Real-time |
| **Bisa diakses SDK?** | ❌ Tidak | ✅ Ya |
| **Cross-webhook?** | ❌ Tidak | ✅ Ya |
| **Scalable?** | ❌ Terbatas | ✅ Unlimited |
| **Analytics/Monitoring?** | ❌ Tidak ada | ✅ Full queryable |

n8n memory bersifat **ephemeral dan per-workflow-execution** — artinya setiap kali webhook dipanggil, memory sebelumnya tidak ada. Firestore adalah satu-satunya sumber kebenaran (source of truth) untuk INFRIA.

---

## Firestore Project

Gunakan Firestore project yang sama dengan INFRIA Console:

```
Firebase Project: [project yang sama dengan konsol]
Firestore Database: (default)
```

Untuk menulis ke Firestore dari n8n, gunakan:
- **HTTP Request node** → Firestore REST API, atau
- **Google Cloud Firestore node** (jika tersedia di n8n instance kamu)

Autentikasi ke Firestore: gunakan **Google Service Account** yang sudah punya role `Cloud Datastore User` pada Firebase project.

---

## 1. Penyimpanan Sesi Chat

### Kapan ditulis?
Setiap kali n8n menerima request dari endpoint `/runtime/chat` atau `/runtime/console-simulator`.

### Struktur Dokumen

**Path sesi:**
```
users/{ownerUid}/projects/{projectId}/chatSessions/{sessionId}
```

**Data sesi (upsert — create jika belum ada, update jika sudah ada):**
```json
{
  "id": "sim_abc12345",
  "projectId": "my-project-id",
  "source": "SIMULATOR",
  "title": "Halo, apa yang bisa kamu bantu?",
  "messageCount": 3,
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-01-01T00:05:00Z"
}
```

> **`title`**: Ambil dari **pesan pertama user** di sesi ini (potong 60 karakter). Jika sesi sudah ada, jangan update title.

**Path pesan:**
```
users/{ownerUid}/projects/{projectId}/chatSessions/{sessionId}/messages/{autoId}
```

**Data pesan user (add document):**
```json
{
  "role": "user",
  "content": "Halo, apa yang bisa kamu bantu?",
  "timestamp": "2025-01-01T00:00:00Z"
}
```

**Data pesan assistant (add document setelah response LLM):**
```json
{
  "role": "assistant",
  "content": "Halo! Saya siap membantu kamu.",
  "timestamp": "2025-01-01T00:00:01Z",
  "metadata": {
    "route": "DIRECT",
    "latencyMs": 342,
    "requestId": "req_abc123",
    "retrievalSources": 0
  }
}
```

### Bagaimana cara dapat `ownerUid`?

Dari API key header (`x-api-key`), lookup ke Firestore index:

**Collection: `_apiKeyIndex/{hashedKey}`**
```json
{
  "ownerUid": "uid123",
  "projectId": "project-id",
  "status": "active"
}
```

Rekomendasi: hash API key dengan SHA-256 sebagai document ID untuk lookup O(1).

---

## 2. Analytics Events

### Kapan ditulis?
**Setiap request selesai diproses** — baik sukses, error, maupun fallback.

### Path dokumen
```
users/{ownerUid}/projects/{projectId}/analyticsEvents/{autoId}
```

### Schema event (semua field wajib diisi)

```json
{
  "requestId": "req_abc123xyz",
  "projectId": "my-project-id",
  "source": "SDK",
  "route": "RAG",
  "status": "SUCCESS",
  "latencyMs": 342,
  "timestamp": "2025-01-01T00:00:00Z",
  "createdAt": "2025-01-01T00:00:00Z",
  "functionName": null,
  "retrievalSources": 3,
  "appName": "My Flutter App",
  "sessionId": "sim_abc12345"
}
```

### Nilai yang valid

| Field | Nilai yang valid |
|-------|-----------------|
| `source` | `"SDK"` / `"SIMULATOR"` / `"DASHBOARD"` |
| `route` | `"RAG"` / `"FUNCTION"` / `"DIRECT"` |
| `status` | `"SUCCESS"` / `"ERROR"` / `"FALLBACK"` |
| `functionName` | nama fungsi jika FUNCTION, `null` jika tidak |
| `retrievalSources` | jumlah chunk RAG yang diinjeksi |
| `appName` | dari header `x-infria-app-name`, `null` jika dari console |

### Logic penentuan `route`:
```
IF response berisi function_call → route = "FUNCTION"
ELSE IF ragChunksInjected > 0    → route = "RAG"
ELSE                              → route = "DIRECT"
```

### Logic penentuan `status`:
```
IF exception / HTTP error thrown  → status = "ERROR"
ELSE IF ragFallback === true       → status = "FALLBACK"
ELSE                               → status = "SUCCESS"
```

---

## 3. Validasi App Registration (Connected App)

### Background

Hanya API key tidak cukup — siapapun yang tau key bisa pakai tanpa terdeteksi. Flutter SDK harus **mendaftarkan dirinya** (register app) saat `initializeApp()` agar muncul di Connected Apps console.

### Endpoint baru yang perlu dibuat di n8n:

```
POST /runtime/register-app
```

**Headers yang dikirim SDK:**
```
x-api-key:           infria_pk_...
x-infria-app-name:   Toko Kita App
x-infria-platform:   flutter
x-infria-package:    com.tokokita.app
Content-Type:        application/json
```

**Body:**
```json
{
  "projectId": "my-project-id",
  "appVersion": "1.0.0"
}
```

**Alur handler n8n:**
```
1. Validate API key → dapat ownerUid + projectId
2. Cek Firestore: users/{ownerUid}/projects/{projectId}/connectedApps
   WHERE appName == headers['x-infria-app-name']
3a. Jika belum ada → create doc:
    {
      "appName": "Toko Kita App",
      "platform": "flutter",
      "packageId": "com.tokokita.app",
      "apiKeyPrefix": "infria_pk_****xxxx",
      "status": "active",
      "firstSeen": "ISO",
      "lastSeen": "ISO",
      "appVersion": "1.0.0"
    }
3b. Jika sudah ada → update lastSeen + appVersion
4. Return: { success: true, appId: "...", registered: true }
```

### Validasi pada setiap `/runtime/chat` request:

```
1. Baca header x-infria-app-name (optional tapi dianjurkan)
2. Jika ada: cek di connectedApps apakah terdaftar?
3. Jika tidak terdaftar → masih izinkan (PERMISSIVE MODE),
   log "unknown_app" di analytics
4. Jika terdaftar → simpan appName di analytics event
```

> Gunakan **Permissive Mode** dulu selama development. Switch ke strict (403) setelah production stable.

---

## 4. Conversation History (Memory LLM)

Request body yang dikirim console/SDK akan menyertakan history:

```json
{
  "projectId": "...",
  "sessionId": "sim_abc123",
  "message": "Pesanan saya sudah sampai belum?",
  "source": "SDK",
  "conversationHistory": [
    { "role": "user", "content": "Halo" },
    { "role": "assistant", "content": "Halo! Ada yang bisa saya bantu?" },
    { "role": "user", "content": "Saya mau cek pesanan" },
    { "role": "assistant", "content": "Baik, nomor pesanan berapa?" }
  ]
}
```

n8n harus inject ini ke LLM messages array:

```json
[
  { "role": "system", "content": "You are INFRIA Assistant..." },
  { "role": "user", "content": "Halo" },
  { "role": "assistant", "content": "Halo! Ada yang bisa saya bantu?" },
  ...
  { "role": "user", "content": "Pesanan saya sudah sampai belum?" }
]
```

> Batasi: ambil **maksimal 10 pesan terakhir** (5 pasang) untuk efisiensi token.

---

## 5. Checklist untuk Tim n8n

- [ ] **Simpan sesi** ke `.../chatSessions/{sessionId}` (upsert)
- [ ] **Simpan messages** ke `.../chatSessions/{sessionId}/messages/{autoId}`
- [ ] **Tulis analytics event** ke `.../analyticsEvents/{autoId}` setiap request
- [ ] **Buat `POST /runtime/register-app`** untuk SDK registration
- [ ] **Validasi appName** pada `/runtime/chat` (permissive mode)
- [ ] **Support `conversationHistory`** di request body untuk LLM context (max 10 msg)
- [ ] **Buat `_apiKeyIndex`** collection untuk fast lookup API key → ownerUid
- [ ] **Generate + return `requestId`** di setiap response
- [ ] **Simpan `appName`** dari header `x-infria-app-name` ke analytics event

---

## 6. Firestore Collection Map (Ringkasan)

```
users/
  {ownerUid}/
    projects/
      {projectId}/
        analyticsEvents/          ← BARU: tulis setelah setiap request
          {autoId}

        chatSessions/             ← BARU: tulis saat ada percakapan
          {sessionId}
            messages/
              {autoId}

        connectedApps/            ← BARU: tulis saat SDK register
          {autoId}

        knowledge/                ← sudah ada
        functions/                ← sudah ada
        ai_config/                ← sudah ada

_apiKeyIndex/                    ← BARU: fast lookup API key → ownerUid
  {sha256(apiKey)}
```

---

*Pertanyaan atau klarifikasi: hubungi tim console INFRIA.*
