# INFRIA n8n Integration Spec (v2.0 — Stateless Orchestrator)
**Untuk: Tim n8n Workflow**  
**Versi:** 2.0 (Stateless AI Orchestrator)  
**Tanggal:** 2025  
**Source of Truth:** Backend INFRIA Console Team

---

## 1. Arsitektur & Prinsip Utama

> ⚠️ **PENTING: n8n TIDAK PERLU koneksi ke Firestore sama sekali.**  
> n8n berfungsi murni sebagai **Stateless AI Orchestrator & Reasoning Engine**. Semua urusan database (baca/tulis sesi chat, simpan pesan, pencatatan analytics, validasi API key, dan registrasi app) **100% ditangani oleh Backend INFRIA (`functions/`)**.

```
[ Flutter SDK / Web Console Simulator ]
                │
                ▼  (HTTP POST /v1/runtime/chat)
    [ INFRIA Backend (Cloud Functions) ]
        ├── Validasi API Key & Tenant
        ├── RAG Vector Search (Firestore Native Cosine)
        ├── Ambil AI Config & Active Functions
        ├── Ambil Riwayat Chat (chatSessions/{sessionId}/messages)
        │
        ▼  (HTTP POST Webhook — Normalized Payload)
         [ n8n Workflow (AI Orchestrator) ]
             ├── Susun System Prompt (Persona + RAG Context)
             ├── Inject Conversation History ke LLM
             ├── Bind Tools / Functions
             └── Call LLM (OpenAI / Claude)
        │
        ▼  (HTTP 200 Response — { type: "message" | "function_call" })
    [ INFRIA Backend (Cloud Functions) ]
        ├── Simpan Pesan User & Assistant ke Firestore
        ├── Catat Analytics Event ke Firestore
        │
        ▼  (HTTP 200 Response)
[ Flutter SDK / Web Console Simulator ]
```

---

## 2. Kenapa n8n Tidak Perlu Simple Memory & Tidak Perlu Baca Firestore?

| Pendekatan | Masalah / Kelemahan | Solusi INFRIA (v2.0) |
|---|---|---|
| **n8n Simple Memory** | Data tersimpan lokal di memory n8n. Jika n8n restart atau scale multi-worker, memory hilang. Web Console Simulator & Flutter SDK tidak bisa melihat riwayat chat. | ❌ **JANGAN PAKAI**. |
| **n8n Colok Firestore** | Perlu Google Service Account, setup credentials JSON di n8n, rawan permission error, workflow n8n jadi berat & lambat. | ❌ **TIDAK PERLU**. |
| **Stateless via Backend (Recommended)** | Backend yang mengambil 10 pesan terakhir dari Firestore dan mengirimkannya ke n8n di array `conversationHistory`. Selesai LLM menjawab, Backend yang menyimpannya ke Firestore. | ✅ **YANG KITA PAKAI**. n8n murni *stateless*. |

---

## 3. Webhook Setup di n8n

1. **Buat Webhook Node:**
   - **Method:** `POST`
   - **Path:** `/runtime/chat` (atau sesuai konfigurasi n8n kamu)
   - **Respond:** `Using 'Respond to Webhook' Node` (agar n8n bisa return JSON setelah LLM selesai)
2. **Autentikasi (Optional tapi Recommended):**
   - Header: `Authorization: Bearer <N8N_SHARED_SECRET>`
3. Masukkan URL Webhook n8n production/tunnel ke `.env` Backend:
   ```env
   N8N_RUNTIME_WEBHOOK=https://your-n8n-instance.com/webhook/runtime/chat
   N8N_SHARED_SECRET=your_secret_key_here
   ```

---

## 4. Input Payload (Yang Dikirim Backend ke n8n)

Backend akan mengirimkan HTTP POST JSON dengan salah satu dari 2 skenario:

### Skenario A: Chat Baru / Chat Lanjutan (Fresh Message)

```json
{
  "project": {
    "id": "prj_store_abc123"
  },
  "session": {
    "id": "sess_flutter_001"
  },
  "user": {
    "id": "usr_owner_xyz"
  },
  "ai": {
    "assistantName": "INFRIA Assistant",
    "role": "Customer Service",
    "language": "id",
    "tone": "friendly",
    "model": "gpt-4o-mini"
  },
  "knowledge": {
    "enabled": true,
    "context": [
      "Potongan dokumen RAG 1: Jam operasional toko adalah 08.00 - 21.00 WIB.",
      "Potongan dokumen RAG 2: Pengiriman same-day maksimal order pukul 14.00 WIB."
    ]
  },
  "functions": [
    {
      "id": "fn_check_order",
      "name": "check_order_status",
      "description": "Mengecek status pengiriman pesanan pelanggan berdasarkan Order ID",
      "parameters": {
        "type": "object",
        "properties": {
          "orderId": {
            "type": "string",
            "description": "Nomor ID pesanan (contoh: INV-001)"
          }
        },
        "required": ["orderId"]
      }
    }
  ],
  "message": "Pesanan INV-001 saya sudah dikirim belum ya?",
  "conversationHistory": [
    { "role": "user", "content": "Halo, saya mau tanya pesanan" },
    { "role": "assistant", "content": "Halo! Boleh sebutkan nomor pesanannya?" }
  ]
}
```

### Skenario B: Resume Function Result (Setelah Client Flutter Selesai Eksekusi Function)

Jika sebelumnya AI meminta function call, SDK Flutter mengeksekusi function tersebut di HP user, lalu mengirim hasilnya kembali ke Backend. Backend kemudian memanggil webhook n8n lagi untuk **Resume** LLM:

```json
{
  "resume": true,
  "requestId": "req_8600cd91b7024e0b",
  "project": { "id": "prj_store_abc123" },
  "session": { "id": "sess_flutter_001" },
  "user": { "id": "usr_owner_xyz" },
  "ai": {
    "assistantName": "INFRIA Assistant",
    "role": "Customer Service",
    "language": "id",
    "tone": "friendly",
    "model": "gpt-4o-mini"
  },
  "functions": [ ...daftar function sama seperti di atas... ],
  "functionResult": {
    "name": "check_order_status",
    "arguments": { "orderId": "INV-001" },
    "result": {
      "status": "SHIPPED",
      "courier": "JNE",
      "trackingNumber": "JNE123456789"
    }
  },
  "conversationHistory": [ ...10 pesan terakhir... ]
}
```

---

## 5. Yang Perlu Dilakukan n8n Terhadap Payload Tersebut

1. **Susun System Prompt:**
   Gabungkan `ai.*` dan `knowledge.context`:
   ```text
   Kamu adalah {{ $json.ai.assistantName }}, berperan sebagai {{ $json.ai.role }}.
   Gunakan bahasa {{ $json.ai.language }} dengan nada bicara {{ $json.ai.tone }}.

   Gunakan informasi berikut sebagai referensi fakta (Knowledge Base):
   {{ $json.knowledge.context.join("\n\n") }}
   ```
2. **Susun Messages Array untuk LLM:**
   - Masukkan System Prompt di atas (`role: "system"`).
   - Masukkan riwayat chat dari `conversationHistory` (`role: "user"` / `role: "assistant"`).
   - Jika `resume === true`: masukkan pesan tool call dan `functionResult` ke context pesan LLM.
   - Jika chat biasa: masukkan pesan user saat ini (`message`).
3. **Pasang Tools/Function Calling:**
   - Bind array `functions` ke tool schema OpenAI / Claude Node.
4. **Jalankan LLM.**

---

## 6. Output Response (Yang Wajib Dikembalikan n8n ke Backend)

Gunakan node **Respond to Webhook** dengan status `200 OK`. Format response harus berupa JSON persis seperti salah satu dari 2 tipe berikut:

### Tipe 1: AI Menjawab Teks Biasa (`type: "message"`)
Gunakan format ini ketika AI memberikan jawaban teks langsung ke user:

```json
{
  "type": "message",
  "data": {
    "content": "Pesanan INV-001 Anda saat ini sudah dikirim via JNE dengan resi JNE123456789."
  }
}
```

### Tipe 2: AI Memutuskan Memanggil Fungsi (`type: "function_call"`)
Gunakan format ini jika AI mendeteksi butuh data eksternal dari HP/Flutter:

```json
{
  "type": "function_call",
  "data": {
    "function": "check_order_status",
    "arguments": {
      "orderId": "INV-001"
    }
  }
}
```

> ⚠️ **Catatan penting struktur response:**  
> Backend INFRIA memvalidasi secara ketat: `response.type` harus `'message'` atau `'function_call'` (atau `'error'`).  
> Pastikan isi responnya dibungkus dalam objek `data`.

### Tipe 3: Terjadi Error di n8n / Provider AI (`type: "error"`)
Jika API OpenAI rate-limit atau error:

```json
{
  "type": "error",
  "message": "OpenAI rate limit exceeded or invalid API key"
}
```

---

## 7. Checklist untuk Developer n8n

- [ ] Buat Webhook Node `POST` dengan mode `Respond to Webhook`.
- [ ] Parsing `ai.assistantName`, `ai.role`, `ai.tone`, dan `ai.language` ke System Message.
- [ ] Inject array `knowledge.context` ke dalam System Message (jika `knowledge.enabled === true` dan ada isinya).
- [ ] Inject `conversationHistory` ke messages array LLM.
- [ ] Bind array `functions` ke Tools / Function Calling node LLM.
- [ ] Handle response:
  - Jika LLM menghasilkan teks balasan → return JSON `{ type: "message", data: { content: "..." } }`.
  - Jika LLM memanggil tool → return JSON `{ type: "function_call", data: { function: "...", arguments: { ... } } }`.
- [ ] **TIDAK PERLU** membuat koneksi Firestore atau node Firestore di n8n.
- [ ] **TIDAK PERLU** memasang node Simple Memory di n8n.
