# Phase 1 – Ollama Validation Log

Tanggal pengujian: 2026-08-13 (Asia/Bangkok)

## Environment

- `AI_PROVIDER=ollama`
- `OLLAMA_TUNNEL_URL` kosong – tidak ada Cloudflare Tunnel aktif yang dapat diuji.
- Ollama lokal aktif pada `http://127.0.0.1:11434`.
- Model tersedia: `qwen3-vl:2b` (vision, 2.1B, Q4_K_M).
- `OLLAMA_MODEL=qwen3-vl:2b` ditambahkan ke `.env.local` agar model yang tersedia dipakai.
- Repository tidak menyediakan foto sampah; `logo.png` dipakai sebagai fixture non-food untuk smoke test, bukan validasi akurasi foto sampah nyata.

## Results

| Test | Input | Latency | JSON valid di `response` | Hasil |
|---|---|---:|---|---|
| Ollama `/api/tags` | konektivitas lokal | 0.53 s | N/A | Berhasil; model vision terdeteksi |
| Ollama `/api/generate` | text-only `{\"ok\":true}` | 15.02 s | Ya | Respons valid, tetapi lambat |
| Vision case 1 | `logo.png` + classify prompt | 70.30 s | Tidak | Timeout |
| Vision case 2 | `logo.png` + classify prompt | 70.25 s | Tidak | Timeout |
| Vision case 3 | `logo.png` + classify prompt | 70.36 s | Tidak | Timeout |
| Vision follow-up | `logo.png`, `think=false`, `format=json` | 4.97 s | Tidak | JSON berada di field `thinking`, `response` kosong |
| `/api/waste/classify` | `logo.png`, `track=b2b` | 65.33 s | Tidak | Request timeout pada konfigurasi provider awal |

Contoh respons follow-up menunjukkan `thinking` berisi JSON, sedangkan `response` kosong.
Implementasi `src/lib/ai/provider.ts` hanya mem-parse `data.response`, sehingga hasil ini
tetap menjadi `UNPARSEABLE_AI_RESPONSE` atau timeout pada endpoint.

## Keputusan Go/No-Go

**NO-GO untuk `AI_PROVIDER=ollama` pada kondisi saat ini.**

Alasan:

1. Tunnel URL kosong, sehingga konektivitas eksternal belum terbukti.
2. Vision latency jauh di atas target `<5 detik` dan beberapa request timeout.
3. Output JSON tidak konsisten pada field yang dibaca provider (`response` kosong, JSON ada di `thinking`).
4. Endpoint classify tidak menyelesaikan request dalam batas waktu demo.

Keputusan implementasi setelah validasi: gunakan `AI_PROVIDER=openai` dengan
`OPENAI_MODEL=gpt-4.1-mini` sebagai provider demo, karena tersedia kredit API dan model
vision ini memiliki output JSON terkontrol. Gemini `gemini-2.5-flash-lite` tetap tersedia
sebagai fallback berbiaya rendah. Ollama tidak dihapus; tetap menjadi opsi roadmap setelah
tunnel dan parsing field `thinking` diperbaiki.

## GPT smoke test

| Foto | Latency | JSON | Klasifikasi | Kontaminasi |
|---|---:|---|---|---|
| `sampah1.jpeg` | 2.35 s | valid | sayur, 1.5 kg | tidak |
| `sampah2.jpg` | 1.98 s | valid | campuran, 1.2 kg | tidak |
| `sampah3.jpg` | 2.53 s | valid | campuran, 2.5 kg | tidak |
| `sampah4.jpeg` | 2.23 s | valid | campuran, 0.3 kg | ya – plastik |
| `sampah5.jpg` | 1.47 s | valid | buah, 2.5 kg | tidak |
| `sampah6.jpeg` | 1.77 s | valid | campuran, 0.5 kg | ya – plastik |

Semua uji menggunakan `gpt-4.1-mini` dan structured JSON output.
