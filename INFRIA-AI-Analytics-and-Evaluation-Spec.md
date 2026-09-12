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

| Level | Kriteria | Dampak pada Sistem |
|---|---|---|
| **`HIGH`** | Dokumen RAG memuat jawaban lengkap, jelas, dan spesifik tanpa memerlukan asumsi tambahan. | Jawaban sangat terpercaya. |
| **`MEDIUM`** | Dokumen RAG relevan dengan topik, namun hanya menjawab sebagian pertanyaan atau membutuhkan ekstrapolasi logis. | Jawaban cukup baik, tapi ada ruang perbaikan dokumen. |
| **`LOW`** | Dokumen RAG yang ditarik hampir tidak menjawab inti pertanyaan, atau AI harus menebak/menggunakan pengetahuan umum karena dokumen kurang spesifik. | **Ditandai sebagai indikasi Knowledge Gap**. |
| **`NONE`** | Tidak ada dokumen RAG yang relevan sama sekali (RAG Miss/Fallback), atau pertanyaan dijawab murni dari general knowledge AI tanpa data perusahaan. | **Knowledge Gap Prioritas Tinggi**. |

### 4.2 Knowledge Gap (`isKnowledgeGap`)
- Tipe data: `boolean` (`true` atau `false`).
- Nilai `true` diberikan jika pertanyaan relevan dengan produk/bisnis, tetapi dokumen yang disuplai ke AI **tidak memiliki data yang cukup** untuk menjawab secara tuntas.

### 4.3 Kategori Topik (`topicCategory`)
Nama kategori singkat yang dirangkum AI (contoh: `"SOP Pengiriman"`, `"Billing & Refund"`, `"Troubleshooting Teknis"`, `"Akun & Keamanan"`, `"Promosi & Diskon"`).

### 4.4 Judul Sesi (`sessionTitle`)
Judul ringkas (3-6 kata) yang merangkum topik pembicaraan. Dihasilkan pada pesan pertama sesi atau diperbarui saat topik percakapan bergeser.

---

## 5. Panduan Prompting untuk Workflow n8n

Di dalam workflow n8n, instruksikan model LLM (OpenAI / Claude) melalui System Prompt atau Structured Output Schema:

### Contoh Instruksi System Prompt di n8n:
```text
Selain menjawab pertanyaan user secara ramah dan profesional, lakukan evaluasi kualitas grounding terhadap data Knowledge Base yang diberikan:

1. Nilai "evidenceLevel" sebagai:
   - "HIGH": Jika data Knowledge Base menjawab pertanyaan user secara tegas dan lengkap.
   - "MEDIUM": Jika data Knowledge Base hanya menjawab sebagian.
   - "LOW": Jika data Knowledge Base ada tapi kurang memadai/lemah untuk menjawab inti pertanyaan.
   - "NONE": Jika tidak ada informasi relevan sama sekali di Knowledge Base.

2. Berikan "evidenceReason": Jelaskan dalam 1 kalimat singkat alasan penilaian tersebut (dokumen mana yang dipakai atau bagian mana yang kurang).

3. Set "isKnowledgeGap": bernilai true jika pertanyaan ini seharusnya bisa dijawab oleh data perusahaan namun dokumen yang diberikan belum memuat informasi tersebut.

4. Berikan "topicCategory": Kategori singkat topik pertanyaan (contoh: "Pengiriman", "Refund", "Produk").

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
