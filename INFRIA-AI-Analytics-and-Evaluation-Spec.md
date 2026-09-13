# INFRIA AI Analytics & Grounding Evaluation Spec
**Untuk: Tim n8n, Tim Backend, dan Tim Console Dashboard**  
**Versi:** 1.0  
**Tanggal:** 2025  
**Source of Truth:** INFRIA Architecture & Analytics Team

---

## 1. Executive Summary & Latar Belakang

Fitur Analytics di INFRIA tidak hanya mencatat metrik teknis seperti *latency* dan *status code*, melainkan berfungsi sebagai **AI Business Intelligence & Knowledge Health Monitor**. 

Sistem ini dirancang untuk menjawab pertanyaan strategis pemilik aplikasi:
1. **Evidence & Grounding**: Seberapa kuat jawaban AI didukung oleh data dokumen di Knowledge Base? Karena apa dinilai demikian?
2. **Knowledge Gaps**: Pertanyaan apa saja yang sering ditanyakan user namun datanya belum lengkap atau lemah di Knowledge Base? (Memberi tahu admin: *"Dokumen apa yang harus segera di-upload"*).
3. **Top Inquired Topics**: Topik atau kategori apa yang paling mendominasi interaksi pengguna?
4. **Hardest Questions**: Pertanyaan apa yang paling sering memicu fallback atau gagal dijawab dengan baik?
5. **Contextual Session Titles**: Setiap sesi chat otomatis memiliki judul ringkas yang mencerminkan topik masalah user, bukan sekadar potongan teks acak.

---

## 2. Arsitektur Aliran Data Analytics

```
[ End User / Flutter SDK ]
            │  1. Kirim pertanyaan ("Apakah garansi mencakup kerusakan air?")
            ▼
[ INFRIA Backend (Cloud Functions) ]
            │  2. RAG Native: Ambil top chunk dokumen dari Firestore Vector
            │  3. Ambil riwayat chat (conversationHistory)
            │  4. Kirim Normalized Payload + RAG Chunks ke n8n
            ▼
[ n8n AI Orchestration Workflow ]
            │  5. LLM menjawab pertanyaan sekaligus melakukan Self-Evaluation:
            │     - Hitung Evidence Level (HIGH / MEDIUM / LOW / NONE)
            │     - Jelaskan Evidence Reason
            │     - Deteksi apakah ini Knowledge Gap (true/false)
            │     - Klasifikasikan Topik (Topic Category)
            │     - Buat Ringkasan Judul Sesi (Session Title)
            │  6. Return JSON response beserta metadata evaluasi ke Backend
            ▼
[ INFRIA Backend ]
            │  7. Tulis pesan user & assistant ke: chatSessions/{sessionId}/messages
            │  8. Upsert judul sesi ke: chatSessions/{sessionId}
            │  9. Catat event komprehensif ke: analyticsEvents/{eventId}
            ▼
[ INFRIA Web Console Dashboard ]
            - Analytics Overview (Total Requests, Latency, Routes)
            - Knowledge Gaps Widget (Daftar topik yang butuh tambahan dokumen)
            - Topic Clustering (Topik terpopuler)
            - Simulator Trace Debugger (Melihat Evidence Level & Reason per percakapan)
```

---

## 3. Kontrak Respons dari n8n (AI Response with Evaluation Metadata)

Agar n8n dapat menyuplai data analitik ini, node LLM di n8n diinstruksikan untuk mengembalikan format JSON terstruktur.

### Format Response yang Diharapkan dari n8n ke Backend:

```json
{
  "type": "message",
  "data": {
    "content": "Garansi resmi produk kami berlaku selama 1 tahun, namun tidak mencakup kerusakan yang diakibatkan oleh cairan atau kelalaian pengguna.",
    "sessionTitle": "Klaim Garansi Kerusakan Cairan",
    "metadata": {
      "evidenceLevel": "HIGH",
      "evidenceReason": "Ditemukan secara eksplisit pada dokumen 'SOP Garansi 2025' Pasal 4 Ayat 2 mengenai pengecualian garansi cairan.",
      "isKnowledgeGap": false,
      "topicCategory": "Garansi & Perbaikan"
    }
  }
}
```

Jika AI memutuskan melakukan **Function Calling**:
```json
{
  "type": "function_call",
  "data": {
    "function": "check_warranty_status",
    "arguments": {
      "serialNumber": "SN-99214"
    },
    "sessionTitle": "Pengecekan Status Garansi",
    "metadata": {
      "evidenceLevel": "HIGH",
      "evidenceReason": "AI membutuhkan data live dari perangkat/API untuk memverifikasi serial number.",
      "isKnowledgeGap": false,
      "topicCategory": "Garansi & Perbaikan"
    }
  }
}
```

---

## 4. Definisi Nilai Evaluasi (Grounding Metrics)

### 4.1 Evidence Level (`evidenceLevel`)

| Level | Kriteria | Dampak pada Sistem & Rekomendasi |
|---|---|---|
| **`HIGH`** | Dokumen RAG memuat jawaban lengkap, jelas, eksplisit, dan tanpa ambiguitas. | Jawaban terverifikasi penuh (*Fully Grounded*). |
| **`MEDIUM`** | Dokumen RAG ada dan relevan, namun data masih **ambigu**, implisit, atau hanya menjawab sebagian pertanyaan. | Jawaban cukup baik, namun dokumen KB **perlu diperjelas/diperinci** agar tidak ambigu. |
| **`LOW`** | Dokumen RAG ada sedikit kesamaan kata kunci tapi melenceng jauh, ATAU **pertanyaan user tidak masuk akal / di luar lingkup domain aplikasi** (misal chit-chat umum, pertanyaan hal acak). | Jika pertanyaan bisnis: **Knowledge Gap**. Jika pertanyaan acak/out-of-scope: ditandai sebagai non-domain. |
| **`NONE`** | Tidak ada dokumen RAG yang relevan sama sekali (RAG Miss/Fallback), atau dijawab murni dari general knowledge AI. | RAG Fallback. Jika pertanyaan produk: **Knowledge Gap Prioritas Tinggi**. |

### 4.2 Knowledge Gap (`isKnowledgeGap`)
- Tipe data: `boolean` (`true` atau `false`).
- **Aturan Krusial:**
  - Nilai `true` diberikan **HANYA JIKA** pertanyaan relevan dengan produk/bisnis/aplikasi, tetapi dokumen di Knowledge Base belum memuat informasi tersebut.
  - Nilai `false` diberikan jika data sudah ada (**HIGH/MEDIUM**), ATAU jika pertanyaan **sama sekali tidak masuk akal / di luar domain aplikasi** (misal nanya resep masakan di aplikasi e-commerce, atau pertanyaan trolling). Hal ini mencegah admin disarankan membuat dokumen untuk hal-hal yang bukan urusan bisnis aplikasi.

### 4.3 Kategori Topik (`topicCategory`)
Nama kategori singkat yang dirangkum AI (contoh: `"SOP Pengiriman"`, `"Billing & Refund"`, `"Garansi & Servis"`, `"Akun & Keamanan"`).  
*Jika pertanyaan di luar domain:* Beri kategori `"Out of Scope / Chit-chat"`.

### 4.4 Judul Sesi (`sessionTitle`)
Judul ringkas (3-6 kata) yang merangkum topik pembicaraan. Dihasilkan pada pesan pertama sesi atau diperbarui saat topik percakapan bergeser.

---

## 5. Panduan Prompting untuk Workflow n8n

Di dalam workflow n8n, instruksikan model LLM (OpenAI / Claude) melalui System Prompt atau Structured Output Schema:

### Contoh Instruksi System Prompt di n8n:
```text
Selain menjawab pertanyaan user secara ramah dan profesional, lakukan evaluasi kualitas grounding terhadap data Knowledge Base yang diberikan:

1. Nilai "evidenceLevel" sebagai:
   - "HIGH": Jika data Knowledge Base menjawab pertanyaan user secara tegas, eksplisit, dan lengkap.
   - "MEDIUM": Jika data Knowledge Base ada namun informasinya masih AMBIGU, implisit, atau hanya menjawab sebagian.
   - "LOW": Jika data Knowledge Base sangat lemah/tidak menjawab, ATAU jika pertanyaan user tidak masuk akal / di luar lingkup domain aplikasi.
   - "NONE": Jika tidak ada informasi relevan sama sekali di Knowledge Base.

2. Berikan "evidenceReason": Jelaskan dalam 1 kalimat singkat alasan penilaian tersebut (contoh: "Data ada tapi ambigu mengenai ketentuan garansi air" atau "Pertanyaan di luar konteks aplikasi").

3. Set "isKnowledgeGap":
   - bernilai TRUE: HANYA jika pertanyaan relevan dengan bisnis/produk tetapi datanya belum ada/lemah di Knowledge Base.
   - bernilai FALSE: Jika data sudah lengkap/cukup, ATAU jika pertanyaan user di luar lingkup/tidak masuk akal bagi aplikasi ini.

4. Berikan "topicCategory": Kategori singkat topik pertanyaan (contoh: "Garansi", "Pengiriman", "Refund", atau "Out of Scope" jika di luar topik aplikasi).

5. Berikan "sessionTitle": Ringkasan judul sesi 3-5 kata berdasarkan inti kebutuhan user.
```

---

## 6. Skema Penyimpanan Firestore di Backend

Backend INFRIA menyimpan data ini ke dua lokasi Firestore:

### 6.1 Koleksi Event Analytics: `analyticsEvents`
**Path:** `users/{ownerUid}/projects/{projectId}/analyticsEvents/{eventId}`

```json
{
  "requestId": "req_8600cd91b7024e0b",
  "sessionId": "sess_flutter_001",
  "projectId": "prj_store_abc123",
  "source": "SDK",
  "route": "RAG",
  "status": "SUCCESS",
  "latencyMs": 420,
  "retrievalSources": 3,
  "evidenceLevel": "HIGH",
  "evidenceReason": "Ditemukan pada dokumen SOP Garansi Pasal 4.",
  "isKnowledgeGap": false,
  "topicCategory": "Garansi & Perbaikan",
  "querySnippet": "Apakah garansi mencakup kerusakan air?",
  "appName": "Toko Kita Flutter App",
  "timestamp": "2025-01-01T12:00:00.000Z",
  "createdAt": "2025-01-01T12:00:00.000Z"
}
```

### 6.2 Dokumen Sesi Chat: `chatSessions`
**Path:** `users/{ownerUid}/projects/{projectId}/chatSessions/{sessionId}`

```json
{
  "id": "sess_flutter_001",
  "projectId": "prj_store_abc123",
  "title": "Klaim Garansi Kerusakan Cairan",
  "source": "SDK",
  "messageCount": 2,
  "createdAt": "2025-01-01T12:00:00.000Z",
  "updatedAt": "2025-01-01T12:00:01.000Z"
}
```

---

## 7. Logika Analisis & Business Intelligence (Untuk Web Console)

Dengan skema di atas, Web Console dapat mengagregasi insight penting secara otomatis:

### A. Laporan Knowledge Gaps (Pertanyaan Sering Muncul tapi Data Lemah)
- **Filter:** `where("isKnowledgeGap", "==", true)` ATAU `where("evidenceLevel", "in", ["LOW", "NONE"])`.
- **Grouping:** Berdasarkan `topicCategory`.
- **Tampilan UI Console:**
  > ⚠️ **Knowledge Gap Terdeteksi:** 15 pengguna menanyakan *"Syarat Garansi Kerusakan Air"*, namun status evidence LOW.  
  > 💡 **Rekomendasi:** Tambahkan dokumen baru ke Knowledge Base tentang kebijakan kerusakan cairan.

### B. Pertanyaan Populer (Top Inquired Topics)
- **Grouping:** Frekuensi kemunculan `topicCategory` dalam rentang waktu (24 jam, 7 hari, 30 hari).
- **Tampilan UI Console:** Bar chart proporsi pertanyaan pelanggan.

### C. Health Score Knowledge Base
- **Rumus:** `(Jumlah request HIGH / Total request RAG) * 100%`.
- Menunjukkan seberapa komprehensif dokumen Knowledge Base dalam mencakup pertanyaan pelanggan.
