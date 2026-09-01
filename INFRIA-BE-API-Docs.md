# INFRIA Backend API Documentation

API Endpoint INFRIA Backend mengimplementasikan dua jenis autentikasi berdasarkan konteks klien:
1. **Runtime API** (`/v1/runtime/*`): Menggunakan header `x-api-key` dari SDK Flutter/Client.
2. **Console API** (`/v1/api-keys/*`, `/v1/knowledge/*`): Menggunakan header `Authorization: Bearer <firebase_id_token>` dari Dashboard Web Console.

Base URL untuk Production (Contoh Deploy): 
`https://asia-southeast2-infria-e1260.cloudfunctions.net/api/v1`

---

## 1. Runtime APIs
Digunakan secara eksklusif oleh Flutter SDK / End-User Client.

### 1.1 Chat Orchestration
**Endpoint:** `POST /runtime/chat`  
**Auth:** `x-api-key: infria_pk_...`  
**Description:** Endpoint utama untuk input Text dari user. Memisahkan project secara otomatis ke `TenantContext`, melakukan RAG vektor secara native di backend, dan mem-forward ke ORCHESTRATOR (n8n).

**Request Body:**
```json
{
  "projectId": "prj_example_123",
  "sessionId": "sess_flutter_001",
  "message": "Coba cek status order INV-009"
}
```

**Response (Jika AI mengembalikan teks balasan):**
```json
{
  "requestId": "req_8600cd91b7024e0b",
  "type": "message",
  "data": {
    "content": "Status order untuk INV-009 adalah sedang dikemas."
  }
}
```

**Response (Jika AI mengembalikan Function Call ke Flutter):**
```json
{
  "requestId": "req_8600cd91b7024e0b",
  "type": "function_call",
  "data": {
    "function": "check_order_status",
    "arguments": {
      "orderId": "INV-009"
    }
  }
}
```

---

### 1.2 Function Callback Result
**Endpoint:** `POST /runtime/function-result`  
**Auth:** `x-api-key: infria_pk_...`  
**Description:** Endpoint ke-2 pada siklus Function Calling. SDK Flutter akan memanggil endpoint ini setalah menyelesaikan Business Logic Lokal untuk mengirimkan result execution kembali ke Backend, dan "Me-resume" orchestrator.

**Request Body:**
```json
{
  "requestId": "req_8600cd91b7024e0b",
  "functionCallId": "fc_169352..._x8za9",
  "function": {
    "name": "check_order_status",
    "arguments": {
      "orderId": "INV-009"
    }
  },
  "result": {
    "status": "shipped",
    "courier": "JNE"
  }
}
```

**Response (Success Resume - Orchestrator membalas final answer):**
```json
{
  "requestId": "req_8600cd91b7024e0b",
  "type": "message",
  "data": {
    "content": "Berdasarkan sistem kami, pesanan INV-009 saat ini berstatus shipped via JNE."
  }
}
```

---

## 2. Web Console APIs
Digunakan secara eksklusif oleh Dashboard React/Next.js INFRIA.

### 2.1 Generate API Key
**Endpoint:** `POST /api-keys/generate`  
**Auth:** `Authorization: Bearer eyJhbG...` (Firebase UI Token)  
**Description:** Generate INFRIA SDK API key baru (`infria_pk_...`) khusus untuk spesifik project. Key ini **hanya direturn 1 kali** secara plaintext di Response.

**Request Body:**
```json
{
  "projectId": "prj_example_123",
  "name": "Flutter Prod Key",
  "environment": "production"
}
```

**Response:**
```json
{
  "id": "apiKey_doc_1234",
  "key": "infria_pk_81f2a4c9b83e40d7a6f2"
}
```

---

### 2.2 Revoke API Key
**Endpoint:** `POST /api-keys/revoke`  
**Auth:** `Authorization: Bearer eyJhbG...`  
**Description:** Menonaktifkan API key secara permanen. Key tidak akan dihapus dari Firestore tetapi flag `status` akan menjadi `revoked`.

**Request Body:**
```json
{
  "projectId": "prj_example_123",
  "keyId": "apiKey_doc_1234"
}
```

**Response:**
```json
{
  "status": "success"
}
```

---

### 2.3 Publish Knowledge
**Endpoint:** `POST /knowledge/publish`  
**Auth:** `Authorization: Bearer eyJhbG...`  
**Description:** Menyimpan raw text untuk kemudian di-*chunk* menjadi block, dibuatkan *Embeddings* via OpenAI, dan disimpan ke Vector Firestore Collection secara native.

**Request Body:**
```json
{
  "projectId": "prj_example_123",
  "knowledgeId": "knw_rules_99",
  "text": "Aturan refund INFRIA: User harus melakukan return maksimal 7 hari setelah barang diterima. ..."
}
```

**Response (Accepted Processing):**
```json
{
  "status": "success",
  "message": "Knowledge successfully indexed"
}
```

---

## 3. Global Error Response (Envelope)
Standard Error yang berlaku di **SELURUH ROUTES**.

```json
{
  "error": {
    "code": "INVALID_API_KEY",
    "message": "The provided API key is invalid.",
    "requestId": "req_8600cd91b7024e0b"
  }
}
```

**Daftar Error Code Common:**
- `UNAUTHORIZED`: Token Firebase ID tidak ada/expired (Console).
- `INVALID_API_KEY`: x-api-key tidak ditemukan/salah/revoked (Runtime).
- `PROJECT_SUSPENDED`: Project di freeze / dicabut status activenya.
- `FUNCTION_CALL_EXPIRED`: Flutter telat mengembalikan payload function-result (default 60 detik max).
- `FUNCTION_RESULT_MISMATCH`: SDK salah mengirimkan `functionCallId` untuk request id yang dituju.
- `INVALID_REQUEST`: Terjadi jika `req.body` JSON tidak sesuai format Zod validator.
