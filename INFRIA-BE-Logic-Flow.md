# INFRIA Backend Logic Flow & Ecosystem

Ini adalah dokumentasi *source-of-truth* mengenai alur dan fondasi logika backend aplikasi INFRIA. Backend ini dibangun sebagai **Boundary of Trust / Gateway**, bukan sekadar proxy pasif. 

## 1. Core Principles Backend INFRIA
1. **Trusted Gateway**: Web Console *(Frontend React)* mengakses document `projects`, `functions`, `knowledge`, via *Direct Web SDK* (Firestore reads/writes). Firebase Backend Functions **HANYA** digunakan untuk Privileged Security Opertations: API Key Generation, Runtime Inference (RAG & n8n orchestrator link).
2. **Tenant Context**: Kasta tertinggi keamanan arsitektur. Backend API **tidak pernah percaya** dengan `projectId` yang dimasukin User ke Payload Postman. Middleware akan memeriksa Validasi Kunci → Kunci ini kepunyaan Workspace/UID mana → Punya hak ke ProjectId mana. *Context* `req.tenant { workspaceId, projectId, apiKeyId }` akan di passing ke semua routes & services backend secara paksa.
3. **No Direct LLM in Backend**: Backend INFRIA (`src/modules/runtime`) tidak secara langsung mengirim logic ke Prompt OpenAI. Ia membungkus parameter User dari Flutter, menambahkan hasil Vector Search, dan mengirimkan payload *bersih* (Normalized Payload) dkk ke orchestrator **n8n**.
4. **Analytics Asynchronous**: Semua pencatatan traffic dan token akan di-push secara asinkron menggunakan system 'fire-and-forget' agar tidak membebani latency utama untuk Flutter API. (`analytics.service.js`).

### 1.5 Pre-Orchestration Extraction Pipeline (Bagaimana BE menyiapkan data tanpa LLM)
Walaupun Backend NodeJs membebani n8n dengan tugas berat memikirkan nalar (reasoning), Backend secara cerdik memiliki "Mini-AI" pipeline tersendiri untuk mengekstrak konteks, yaitu:
1. **Penerjemah Bahasa ke Vector (Embedding):** Backend memanggil API OpenAI (Model `text-embedding-3-small`) setiap kali end-user melempar pertanyaan (`/runtime/chat`), untuk merubah kalimat manusia menjadi hitungan matriks matematika Vector. (API ini tidak menggunakan model LLM Text/Chat, harganya sangat murah).
2. **Mesin Penelusur RAG Mandiri:** Setelah Backend mendapat "angka-angka vector" tersebut, Backend **murni menggunakan fitur Firestore Native Search (`findNearest` Cosine Similarity DB)** untuk merangking kecocokan paragraf dan menarik top 3 / 5 text paragraf dokumen yang paling relevan dengan inti pertanyaan sang user! (Inilah rahasianya kenapa RAG INFRIA super cepat dan tidak butuh framework Python tambahan).
3. **App Capabilities (Function Binding):** Backend langsung me-*load* secara buta dari Firestore daftar seluruh fitur/fungsi (*Capabilities*) yang di-set "Active" oleh user. Backend tidak menyeleksi atau memfilter function apa yang harus dipakai (n8n yang akan repot membaca ini semua dan memutuskan).

Semua hal di atas dibungkus rapi menjadi JSON `Normalized Payload` (Lihat poin 5) yang lurus-lurus aja dikirimkan utuh melalui HTTP POST (`Webhook`) ke pintu gerbang n8n (Orchestrator).

---

## 2. Alur Native Eksekusi Runtime Chat (The Loop)

Bagian inti dari INFRIA adalah siklus antara **Flutter SDK ↔ Backend ↔ n8n Orchestrator ↔ External AI**.
Karena limitasi REST API 1-Response Cycle, INFRIA melakukan mekanisme *Idempotent State Machine*.

### Fase Awal: User Bertanya
1. **Client Flutter** mengirimkan chat dari end-user (Misal: `"Tolong check saldo saya di rekening X"`). Dikirim melalui `POST /v1/runtime/chat`.
2. Middleware Backend mengekstrak API Key `infria_pk_...`, mencocokkannya ke database (Tenant Validation) dalam status Hash SHA-256 (Keamanan Extra).
3. **Konfigurasi AI Dinamis**: Backend me-load dokumen konfigurasi User (`tone`, `language`, `role`, `assistantName`, dan `knowledgeEnabled`) dari database `config/ai_settings`.
4. **RAG Pipeline Interceptor**: 
    - Apabila setting `knowledgeEnabled` true, Query `"Tolong check saldo..."` dikirim ke OpenAI text-embedding-3-small di Backend.
    - Menghasilkan vektor float array.
    - Backend mencari `findNearest()` secara spesifik ke koleksi database workspace ini saja berbasis algoritma COSINE Firebase Firestore Native Vectors. Menarik TOP K chunks.
5. Paket Pertanyaan ASLI + String Konteks KNOWLEDGE + Konfigurasi AI + Daftar Fungsi, dibungkus menjadi **Normalized Payload**.
6. Payload Backend ini dikirim lewat `fetch HTTP` ke URL **n8n Webhook Endpoint**. 

*(Catatan n8n: n8n bertugas sebagai executor kosong. Semua Prompt, Model AI, dan Data Knowledge disuplai dari Payload Backend ini. n8n hanya menjalankan OpenAI Node sesuai request payload kita)*.

### Fase Loop: Function Calling (Dynamic Action)
1. **n8n** bersama AI memutuskan bahwa ia tidak cukup data untuk menjawab. AI butuh hit fungsi `check_saldo(rek)`.
2. **n8n** merespons ke request Backend kita. Bukannya mengembalikan `type: "message"`, AI Orchestrator kita akan me-return Payload `type: "function_call"`.
3. **Security Policy Interceptor**: Backend tidak langsung pasrah! Fungsi didaftarkan ke `function-policy.service.js`. Backend INFRIA melakukan double check keamanan: Apakah aplikasi project user benar-benar mendaftarkan kemampuan `check_saldo` di Dashboard Web? Jika Iya, backend menyimpannya sebagai *Tracking State* di Firestore `runtime_states/req_...` dan mem-forward instruksi Function ke Flutter SDK.
4. Payload di Flutter akan men-*trigger* callback Dart kodingan lokal sang Developer.

### Fase Akhir: Resuming & Result (Callback)
1. Kodingan Dev di aplikasi (Client-side Flutter) mengeksekusi hit mandiri ke API Bank X/Server lokal mereka, mendapat result saldo "Rp 50.000".
2. SDK memanggil `POST /v1/runtime/function-result` menuju INFRIA Server lagi (Request ke-2) dengan menempelkan `req_...` and `fc_...` (Tracking ID).
3. Backend memeriksa Tracker State di Firestore, "Apakah tracking ini belum kadaluarsa (60 detik)? Apakah benar diminta fungsi check_saldo?". Jika pas, Status state di Lock menjadi `FUNCTION_RESULT_RECEIVED` (Idempotensi). 
4. Backend mengirim Hasil Rp 50.000 ke n8n. **AI Resume**.
5. AI di n8n membuat rangkuman dan mengembalikan teks `"Saldo reking anda adalah Rp 50.000"`.
6. Backend memanggil Analytics Logger dan me-return final string tersebut ke Flutter User Screen. Selesai.

---

## 3. RAG Pipeline Implementation Flow (Knowledge Base)

1. Dashboard Web React di INFRIA Console merakit document. User hit Submit.
2. Hit ke `POST /v1/knowledge/publish`
3. Backend Server mengubah status Document menjadi `processing`.
4. Logic: `src/ai/rag/chunker.js` melakukan **Parsing Murni dari sisi Backend INFRIA**. Metodenya adalah *Recursive Character Threshold Limit*. Teks yang sangat tebal akan dipotong-potong per 1000 karakter, namun sistem mencari spasi ( ) atau titik (.) terdekat agar kalimat tidak putus patah di tengah kata, sambil memberikan 'Overlap' (Tumpang tindih) 200 karakter agar konteks tetap nyambung antar potongan.
5. Kumpulan Chunker ber-array ini di-lempar dengan metode perulangan asinkron `Promise` ke endpoint provider OpenAI Embedding di `embedding.service.js`.
6. Menggunakan mekanisme Firestore Batch, Vector Vektor Disimpan ke dalam Collection `knowledge_chunks`.
7. Saat Frontend membaca collection Knowledge Document, Status akan otomatis bergeser menjadi `Ready`. 

---

## 4. API Key Strategy

INFRIA menggunakan pendekatan enkripsi Key untuk menghindari Database Hijacking.
- Prefix: `infria_pk_` (digunakan secara awalan untuk mudah dideteksi GitHub Secret Scan/Regex standard DevOps).
- `generateKey` menggunakan Native OS `crypto.randomBytes(16)`.
- Request `generateKey` hanya mengembalikan `string kunci murni` ini sekali saja kepada layar Modal React dari `response` JSON NodeJs.
- Sisanya dimasukkan ke algoritma **Hash SHA-256 (crypto.createHash)** sebelum disave permanen di Database `key`. 
- Saat runtime login, NodeJs mencocokkan string Header dengan Hash yang ada di Database. Apabila cocok, akses diberikan! Keamanan setara layanan Payment Gateway.

---

## 5. API Payload Contract Spesification (Runtime Layer)
Spesifikasi skema komunikasi (JSON payloads) yang mengalir antara Flutter (SDK), Backend, dan Orchestrator (n8n).

### A. Flutter mengirim Chat ke Backend
Dikirim ke `POST /v1/runtime/chat`

**Penting - Autentikasi (Headers):**
Flutter WAJIB mengirimkan `x-api-key` di Headers. 
**[INFO API KEY]:** API Key yang dipakai di sini **BUKAN** `publicApiKey` yang otomatis terbuat dari awal project. `publicApiKey` nantinya hanya untuk verifikasi App Registry biasa.
Key yang dipakai di Endpoint ini adalah **Backend API Keys** / **Secret Key** yang wajib di-generate manual oleh user dari Web Console > **Menu SDK** > Bagian bawah **"Backend API Keys"** (Yang awalnya disembunyikan `••••`).
```http
Headers:
x-api-key: infria_pk_db12a83xxxxxxxxxx
Content-Type: application/json
```

**Body Request:**
- `projectId`: Diambil langsung dari list Project. (Wajib cocok dengan kepemilikan API Key).
- `sessionId`: String unik bebas dari dev Flutter yang menandakan sesi spesifik (misal ID device/uid app pengguna akhir). Supaya n8n tahu history percakapannya.
- `message`: Teks atau prompt dari user.
```json
{
  "projectId": "flutter-prod-123",
  "sessionId": "usr_9988_session",
  "message": "Cek buku tabungan emas saya"
}
```

### B. Backend mengirim Normalized Payload ke n8n (AI Webhook)
Ini adalah bentuk mentah (real) yang dibaca n8n hasil dari `orchestration.service.js`. Semua variabel dipassing (di-inject) lewat JSON ini agar n8n mematuhi profil asisten saat mengeksekusi Node OpenAI:
```json
{
  "project": {
    "id": "flutter-prod-123"
  },
  "session": {
    "id": "usr_9988_session"
  },
  "user": {
    "id": "uid_admin_123"
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
      "Syarat tabungan emas Infr... (teks 1)",
      "Potongan paragraf relevan... (teks 2)"
    ]
  },
  "functions": [
    {
      "id": "doc_id_99",
      "name": "check_saldo",
      "description": "Mengecek saldo",
      "parameters": { "type": "object", "properties": { "acc_no": { "type": "string" } } }
    }
  ],
  "message": "Cek buku tabungan emas saya"
}
```

### C. n8n Merespons ke Backend 
N8n bebas memberikan 2 tipe JSON (Chat biasa ATAU Perintah eksekusi fungsi).  
**Jika Chat Biasa:**
```json
{
  "type": "message",
  "data": {
    "content": "Saldo emas Kakak saat ini adalah 2.5 gram."
  }
}
```
**Jika Butuh Fungsi Backend/Flutter (Looping State):**
```json
{
  "type": "function_call",
  "data": {
    "function": "check_saldo",
    "arguments": { "acc_no": "A-001" }
  }
}
```

### D. Backend me-return hasil n8n tersebut kembali ke Flutter SDK
Dikirim sebagai response `200 OK`. (Identik dengan format n8n, tapi ditambahi `requestId`).
```json
{
  "requestId": "req_1234abcd",
  "type": "function_call",
  "data": {
    "function": "check_saldo",
    "arguments": { "acc_no": "A-001" }
  }
}
```

### E. Flutter menyelesaikan Eksekusi Logic dan meresume (Callback result kembali)
Dikirim ke `POST /v1/runtime/function-result`.
```json
{
  "requestId": "req_1234abcd",
  "functionCallId": "fc_8877",
  "function": {
    "name": "check_saldo",
    "arguments": { "acc_no": "A-001" }
  },
  "result": {
    "status": "success",
    "saldoGrams": 2.5
  }
}
```
*Backend akan menyimpan result ini ke State tracking, lalu mem-resume n8n dengan payload format B (ditambah function execution context) untuk menghasilkan akhir format C.*

---
**This documentation effectively abstracts and grounds the current implementation of Phase 1 - 9 Source Code into actionable logic.**
