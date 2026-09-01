# INFRIA Backend Logic Flow & Ecosystem

Ini adalah dokumentasi *source-of-truth* mengenai alur dan fondasi logika backend aplikasi INFRIA. Backend ini dibangun sebagai **Boundary of Trust / Gateway**, bukan sekadar proxy pasif. 

## 1. Core Principles Backend INFRIA
1. **Trusted Gateway**: Web Console *(Frontend React)* mengakses document `projects`, `functions`, `knowledge`, via *Direct Web SDK* (Firestore reads/writes). Firebase Backend Functions **HANYA** digunakan untuk Privileged Security Opertations: API Key Generation, Runtime Inference (RAG & n8n orchestrator link).
2. **Tenant Context**: Kasta tertinggi keamanan arsitektur. Backend API **tidak pernah percaya** dengan `projectId` yang dimasukin User ke Payload Postman. Middleware akan memeriksa Validasi Kunci → Kunci ini kepunyaan Workspace/UID mana → Punya hak ke ProjectId mana. *Context* `req.tenant { workspaceId, projectId, apiKeyId }` akan di passing ke semua routes & services backend secara paksa.
3. **No Direct LLM in Backend**: Backend INFRIA (`src/modules/runtime`) tidak secara langsung mengirim logic ke Prompt OpenAI. Ia membungkus parameter User dari Flutter, menambahkan hasil Vector Search, dan mengirimkan payload *bersih* (Normalized Payload) dkk ke orchestrator **n8n**.
4. **Analytics Asynchronous**: Semua pencatatan traffic dan token akan di-push secara asinkron menggunakan system 'fire-and-forget' agar tidak membebani latency utama untuk Flutter API. (`analytics.service.js`).

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
**This documentation effectively abstracts and grounds the current implementation of Phase 1 - 9 Source Code into actionable logic.**
