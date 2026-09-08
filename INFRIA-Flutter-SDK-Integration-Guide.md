# INFRIA Flutter SDK — Integration Guide
**Untuk: Tim Flutter SDK Developer**  
**Versi:** 1.0  
**Tanggal:** 2025  
**Dibuat oleh:** INFRIA Console Team

---

## Overview

Dokumen ini menjelaskan cara mengintegrasikan INFRIA Flutter SDK ke dalam aplikasi Flutter, termasuk:

1. Setup awal dan inisialisasi
2. **App Registration** ke INFRIA Console (Connected Apps)
3. Cara kirim chat request ke INFRIA
4. Handling function calls
5. Best practices keamanan

---

> ## 👥 Dua Peran yang Berbeda
>
> Dokumen ini ditujukan kepada **dua pihak** yang berbeda tugasnya:
>
> | Peran | Tanggung jawab |
> |-------|---------------|
> | **SDK Developer** (teman yang buat paket `infria` di Dart/Flutter) | Hardcode URL backend n8n ke dalam SDK. Developer yang pakai SDK tidak boleh tahu URL ini. |
> | **App Developer** (developer Flutter yang *pakai* SDK) | Hanya butuh `projectId` + `apiKey` dari Console. Tidak perlu tahu apa itu n8n atau URL-nya. |
>
> Sama persis dengan Firebase SDK: app developer tidak perlu tahu URL server Firebase, mereka cukup `initializeApp(options)`.


## Konsep Arsitektur

```
Flutter App
    │
    ├── Infria.initializeApp(...)   ← Step 1: Init + Register App
    │       │
    │       └── POST /runtime/register-app → Firestore connectedApps
    │
    └── InfriaChat.send(message)   ← Step 2: Chat Request
            │
            └── POST /runtime/chat → n8n → LLM → response
```

---

## 1. Yang Dibutuhkan dari INFRIA Console

Sebelum bisa integrasi, developer Flutter cukup minta dua hal ke **owner project di Console**:

| Item | Cara Dapatkan | Contoh |
|------|--------------|--------|
| `projectId` | Project Overview → Project ID | `my-store-app-7f42` |
| `apiKey` | SDK & API Keys → Generate Key | `infria_pk_xxxxxxxxxxxxxxxxxxxx` |

> ⚠️ **JANGAN simpan `apiKey` di dalam source code yang dipush ke GitHub.**  
> Gunakan `.env` file atau Flutter flavor environment variables.

> 💡 **`baseUrl` tidak perlu disediakan oleh developer yang pakai SDK.**  
> URL backend INFRIA sudah di-hardcode di dalam paket SDK oleh tim SDK developer (teman kamu yang bikin SDK-nya).  
> Sama seperti Firebase SDK — kamu ga perlu tahu URL server Firebase, tinggal pakai.

---

## 2. Konfigurasi SDK

### Option A: Via INFRIA CLI (Recommended)

```bash
# 1. Install global CLI
dart pub global activate infria_cli

# 2. Login & hubungkan project kamu
infria login
infria init --project=my-store-7f42
```

### Option B: Via Flutter Pub

```bash
flutter pub add infria_sdk
```

Atau manual di `pubspec.yaml`:

```yaml
dependencies:
  infria_sdk: ^1.0.0
```

### Environment Config (untuk App Developer)

Hanya dua variabel yang perlu dikonfigurasi app developer:

```dart
// lib/config/env.dart
class Env {
  static const String projectId = String.fromEnvironment(
    'INFRIA_PROJECT_ID',
    defaultValue: 'your-project-id',
  );
  static const String apiKey = String.fromEnvironment(
    'INFRIA_API_KEY',
    defaultValue: 'infria_pk_...',
  );
  // Tidak ada baseUrl di sini.
  // URL backend sudah di-hardcode di dalam SDK oleh tim SDK developer.
}
```

Jalankan dengan:
```bash
flutter run \
  --dart-define=INFRIA_PROJECT_ID=my-store-7f42 \
  --dart-define=INFRIA_API_KEY=infria_pk_xxx
```

---

> ### 🛠️ Catatan untuk SDK Developer (bukan app developer)
>
> Kamu yang buat paket `infria_sdk` harus hardcode URL backend Cloud Functions (BE API) di dalam SDK, bukan expose ke pengguna SDK (Flutter hit Cloud Functions BE, lalu BE yang koordinasi dengan n8n).
>
> ```dart
> // Di dalam source code SDK (infria_sdk/lib/src/config.dart)
> // Ini TIDAK terekspos ke pubspec atau environment app developer
> class InfriaConfig {
>   // Hardcode URL Cloud Functions BE kamu
>   static const String _baseUrl = 'https://api.infria.io';
>
>   // Atau support multi-environment via SDK build flag
>   // static const String _baseUrl = String.fromEnvironment(
>   //   'INFRIA_INTERNAL_BASE_URL',
>   //   defaultValue: 'https://api.infria.io',
>   // );
>
>   static String get baseUrl => _baseUrl;
> }
> ```
>
> App developer yang pakai SDK sama sekali tidak boleh tahu nilai `_baseUrl` ini.
> Jika URL berubah, cukup update SDK dan publish versi baru — app developer tinggal upgrade versi paketnya.


## 3. App Registration (PENTING)

### Mengapa Perlu Register?

Hanya punya API key tidak cukup. Siapapun yang tahu API key bisa pakai API tanpa terdeteksi. Dengan **App Registration**:

- Console bisa melihat daftar app yang aktif menggunakan project
- Analytics bisa menampilkan traffic per app (`appName`)
- Bisa detect unauthorized usage (appName tidak dikenal)
- Bisa revoke per-app jika ada kebocoran

### Alur Registrasi

```
Saat initializeApp() dipanggil:
1. SDK baca package name dari platform channel (atau dari parameter)
2. SDK kirim POST /runtime/register-app dengan:
   - Header: x-api-key, x-infria-app-name, x-infria-platform, x-infria-package
   - Body: { projectId, appVersion }
3. Backend simpan ke Firestore connectedApps
4. Console menampilkan app di "Connected Apps"
```

### Implementasi di main.dart

```dart
import 'package:flutter/material.dart';
import 'package:infria/infria.dart';
import 'package:package_info_plus/package_info_plus.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Dapatkan info app
  final packageInfo = await PackageInfo.fromPlatform();
  
  // Initialize INFRIA SDK + Register App
  // projectId + apiKey dari Console. baseUrl sudah baked-in di SDK.
  await Infria.initializeApp(
    projectId: Env.projectId,
    apiKey: Env.apiKey,

    // App Registration fields — harus diisi agar muncul di Connected Apps console
    appName: 'Toko Kita App',           // nama yang muncul di console
    platform: InfriaPlatform.flutter,
    packageId: packageInfo.packageName, // com.tokokita.app
    appVersion: packageInfo.version,    // 1.0.0
  );

  runApp(const MyApp());
}
```

### Yang dikirim SDK ke backend saat register:

```http
POST https://n8n.infria.io/runtime/register-app
x-api-key: infria_pk_xxxxxxxxxxxxxxxxxxxx
x-infria-app-name: Toko Kita App
x-infria-platform: flutter
x-infria-package: com.tokokita.app
Content-Type: application/json

{
  "projectId": "my-store-7f42",
  "appVersion": "1.0.0"
}
```

### Yang muncul di Console setelah register:

```
Connected Apps
─────────────────────────────────────
Toko Kita App
com.tokokita.app                      [flutter]
API Key: infria_pk_****xxxx
First seen: Sep 8, 2025
Last seen: Sep 8, 2025 (just now)
```

---

## 4. Mengirim Chat Message

### Basic Usage

```dart
import 'package:infria/infria.dart';

class ChatService {
  final _chat = InfriaChat.instance;
  
  Future<String> sendMessage(String message) async {
    final response = await _chat.send(
      message: message,
      // userId opsional — kalau app punya auth sendiri, isi ini
      // userId: FirebaseAuth.instance.currentUser?.uid,
    );
    
    if (response.type == InfriaResponseType.message) {
      return response.content!;
    } else if (response.type == InfriaResponseType.functionCall) {
      // Handle function call — lihat section 5
      return await _handleFunctionCall(response.functionCall!);
    }
    
    return 'Error: Unknown response type';
  }
}
```

### Request yang dikirim SDK:

```http
POST https://n8n.infria.io/runtime/chat
x-api-key: infria_pk_xxxxxxxxxxxxxxxxxxxx
x-infria-app-name: Toko Kita App
Content-Type: application/json

{
  "projectId": "my-store-7f42",
  "sessionId": "sdk_a1b2c3d4",
  "userId": "firebase-uid-of-end-user",
  "message": "Halo, saya mau cek status pesanan saya",
  "source": "SDK",
  "conversationHistory": [
    { "role": "user", "content": "Halo" },
    { "role": "assistant", "content": "Halo! Ada yang bisa saya bantu?" }
  ]
}
```

### Response yang diterima:

**Tipe message:**
```json
{
  "type": "message",
  "requestId": "req_xyz789",
  "data": {
    "content": "Pesanan Anda saat ini sedang dalam pengiriman."
  },
  "__trace": {
    "ragChunksInjected": 2,
    "route": "RAG"
  }
}
```

**Tipe function_call:**
```json
{
  "type": "function_call",
  "requestId": "req_xyz789",
  "data": {
    "function": "check_order_status",
    "args": {
      "orderId": "ORD-12345"
    }
  }
}
```

---

## 5. Handling Function Calls

Function calls adalah saat AI meminta app Flutter melakukan sesuatu (cek database lokal, buka halaman, dll).

```dart
class ChatService {
  // Daftarkan function handlers saat init
  void setupFunctions() {
    InfriaChat.instance.registerFunction(
      name: 'check_order_status',
      handler: (args) async {
        final orderId = args['orderId'] as String;
        
        // Panggil API internal kamu sendiri
        final status = await OrderApi.getStatus(orderId);
        
        // Return hasil ke SDK — SDK akan kirim balik ke AI untuk dijadikan jawaban
        return {
          'orderId': orderId,
          'status': status.label,
          'estimatedDelivery': status.eta,
        };
      },
    );
    
    InfriaChat.instance.registerFunction(
      name: 'get_product_info',
      handler: (args) async {
        final productId = args['productId'] as String;
        final product = await ProductApi.getById(productId);
        return {
          'name': product.name,
          'price': product.price,
          'stock': product.stock,
        };
      },
    );
  }
}
```

> Daftar fungsi yang tersedia didefinisikan di **INFRIA Console → Functions**.  
> SDK tidak perlu mendaftar ulang fungsinya ke console — cukup implement handler-nya di sini.

---

## 6. Conversation Memory (Session Management)

SDK harus maintain **session ID yang konsisten** per percakapan untuk memory AI.

```dart
class InfriaSessionManager {
  String? _currentSessionId;
  
  // Buat session baru
  String startNewSession() {
    _currentSessionId = 'sdk_${DateTime.now().millisecondsSinceEpoch}_'
        '${Random().nextInt(9999)}';
    return _currentSessionId!;
  }
  
  // Ambil session yang aktif (atau buat baru jika belum ada)
  String get activeSession =>
      _currentSessionId ??= startNewSession();
  
  // Reset session (mulai percakapan baru)
  void resetSession() {
    _currentSessionId = startNewSession();
  }
}
```

SDK akan kirim `sessionId` yang sama selama percakapan berlangsung. Backend (n8n) akan menyimpan riwayat di Firestore dan memuat ulang saat `sessionId` yang sama dipakai lagi.

---

## 7. Session History dari Firestore (Opsional)

Jika app ingin menampilkan riwayat chat yang tersimpan di cloud (cross-device):

```dart
// Tambahkan Firebase ke app Flutter (sudah punya Firebase? skip)
// pubspec.yaml:
// firebase_core: ^2.x
// cloud_firestore: ^4.x

import 'package:cloud_firestore/cloud_firestore.dart';

Stream<List<ChatMessage>> getChatHistory({
  required String ownerUid,    // UID owner project (dari developer kamu)
  required String projectId,
  required String sessionId,
}) {
  return FirebaseFirestore.instance
      .collection('users')
      .doc(ownerUid)
      .collection('projects')
      .doc(projectId)
      .collection('chatSessions')
      .doc(sessionId)
      .collection('messages')
      .orderBy('timestamp')
      .snapshots()
      .map((snap) => snap.docs
          .map((d) => ChatMessage.fromMap(d.data()))
          .toList());
}
```

> **Catatan**: Agar ini aman, set **Firestore Security Rules** yang tepat.  
> End-user Flutter app seharusnya TIDAK boleh read seluruh `users/{ownerUid}/projects/...`.  
> Diskusikan dengan tim console soal rules yang sesuai.

---

## 8. Checklist untuk Tim Flutter SDK

### Implementasi SDK (internal)

- [ ] `Infria.initializeApp()` — panggil `POST /runtime/register-app` saat init
- [ ] Kirim header `x-infria-app-name` di **setiap request** (bukan hanya saat register)
- [ ] Kirim header `x-api-key` di setiap request
- [ ] Generate `sessionId` per conversation session (`sdk_{timestamp}_{random}`)
- [ ] Maintain conversation history (last 10 messages) dan kirim sebagai `conversationHistory`
- [ ] Handle `type: "function_call"` response → invoke registered handler → kirim result kembali
- [ ] Handle `type: "message"` response → return content ke UI
- [ ] Expose `resetSession()` method untuk mulai percakapan baru

### Yang perlu disiapkan di Console (tim console)

- [ ] **Connected Apps list** tampil data dari Firestore `connectedApps`
- [ ] **Analytics** menampilkan `appName` per execution entry
- [ ] **Endpoint docs** tersedia di SDK & API Keys page
- [ ] SDK & API Keys page menampilkan `projectId` dan cara pakai

---

## 9. Security Best Practices

| ✅ DO | ❌ DON'T |
|-------|---------|
| Simpan API key di environment variable | Hardcode API key di source code |
| Gunakan `.gitignore` untuk `.env` file | Push `.env` ke GitHub |
| Gunakan API key per-environment (dev/prod) | Pakai satu key untuk semua environment |
| Rotate API key jika dicurigai bocor | Biarkan key bocor tanpa tindakan |
| Set `appName` yang deskriptif | Biarkan `appName` kosong |
| Implement function handler yang validate input | Langsung execute tanpa validasi |

### Contoh `.env` yang benar:

```
# .env.development
INFRIA_PROJECT_ID=my-store-dev-1234
INFRIA_API_KEY=infria_pk_dev_xxxxxxxxxxxxxxxxxxxx
INFRIA_BASE_URL=https://dev.n8n.infria.io

# .env.production
INFRIA_PROJECT_ID=my-store-prod-5678
INFRIA_API_KEY=infria_pk_prod_xxxxxxxxxxxxxxxxxxxx
INFRIA_BASE_URL=https://n8n.infria.io
```

---

## 10. Error Handling

```dart
try {
  final response = await InfriaChat.instance.send(message: message);
  // handle response
} on InfriaAuthException {
  // API key tidak valid atau sudah direvoke
  // → tampilkan pesan ke developer, bukan ke end-user
  debugPrint('[INFRIA] Invalid API key — check your console');
} on InfriaNetworkException catch (e) {
  // Backend tidak bisa dicapai
  debugPrint('[INFRIA] Network error: ${e.message}');
  // → tampilkan pesan ke user bahwa asisten tidak tersedia
} on InfriaException catch (e) {
  debugPrint('[INFRIA] Error: ${e.code} — ${e.message}');
}
```

---

## 11. Contoh Lengkap: Chat Widget

```dart
class InfriaChatWidget extends StatefulWidget {
  const InfriaChatWidget({super.key});

  @override
  State<InfriaChatWidget> createState() => _InfriaChatWidgetState();
}

class _InfriaChatWidgetState extends State<InfriaChatWidget> {
  final _messages = <ChatMessage>[];
  final _controller = TextEditingController();
  bool _loading = false;

  Future<void> _send() async {
    final text = _controller.text.trim();
    if (text.isEmpty || _loading) return;
    
    _controller.clear();
    setState(() {
      _messages.add(ChatMessage(role: 'user', content: text));
      _loading = true;
    });

    try {
      final response = await InfriaChat.instance.send(message: text);
      setState(() {
        _messages.add(ChatMessage(
          role: 'assistant',
          content: response.type == InfriaResponseType.message
              ? response.content!
              : '[Function executed: ${response.functionCall?.name}]',
        ));
      });
    } catch (e) {
      setState(() {
        _messages.add(ChatMessage(
          role: 'assistant',
          content: 'Maaf, asisten tidak tersedia saat ini.',
        ));
      });
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Expanded(
          child: ListView.builder(
            itemCount: _messages.length,
            itemBuilder: (_, i) => MessageBubble(message: _messages[i]),
          ),
        ),
        Row(
          children: [
            Expanded(child: TextField(controller: _controller)),
            IconButton(onPressed: _send, icon: const Icon(Icons.send)),
          ],
        ),
      ],
    );
  }
}
```

---

*Pertanyaan atau klarifikasi: hubungi tim console INFRIA.*

