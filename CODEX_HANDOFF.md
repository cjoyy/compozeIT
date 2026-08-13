# Codex Handoff

## Status saat ini

Task yang sedang difiksasi adalah **PHASE 0.2 – penyederhanaan skema database**.
Perubahan skema sudah diterapkan di `supabase/seed.sql`, endpoint pickup sudah mengikuti
lifecycle batch baru, dan kontrak API sudah diperbarui. Verifikasi lokal terakhir:
lint berhasil dengan satu warning pre-existing pada `image-upload.tsx`, TypeScript berhasil,
dan tidak ada whitespace error pada diff. Commit checkpoint belum dibuat.

`docs/proposal.md` tidak ditemukan di repository, sehingga konteks proposal hanya dapat
diverifikasi dari `AGENTS.md` dan skill files.

## File yang sudah diubah

Task 0.1 (B2B-only cleanup):

- `src/app/(b2c)/sell-track/page.tsx` – dihapus.
- `src/app/(b2c)/diy-track/page.tsx` – dihapus.
- `src/app/api/waste/diy-guide/route.ts` – dihapus.
- `src/components/role-provider.tsx`, `src/components/navbar.tsx`, `src/app/page.tsx` – UI dan role demo menjadi B2B-only.
- `src/app/api/waste/classify/route.ts` – hanya menerima track `b2b`.
- `src/lib/ai/types.ts`, `src/lib/ai/provider.ts` – prompt DIY dihapus; abstraksi provider tetap dipertahankan.
- `docs/API_CONTRACT.md` – endpoint B2C dihapus dan response classify diperjelas.

Task 0.2 (schema dan traceability):

- `supabase/seed.sql` – menambah `subscription_status`, `total_cashback_balance`, `cashback_amount`, lifecycle `batch_status` baru, migrasi idempoten untuk database lama, default user/track B2B, dan migrasi data track legacy ke `b2b`.
- `src/app/api/pickup/trigger/route.ts` – batch baru dibuat dengan status `submitted` dan response menyertakan status batch.
- `docs/API_CONTRACT.md` – mendokumentasikan `BatchStatus`: `submitted | picked_up | processing | completed | sold`.

File `logo.png` dan direktori `.codex/` adalah perubahan/untracked yang sudah ada dan tidak disentuh.

## Keputusan penting

- Scope final adalah B2B-only; Sell Track dan DIY Track tidak lagi aktif.
- Marketplace dan transactions tetap dipertahankan sebagai mockup berbasis seed.
- Enum legacy `user_type`/`track_type` tetap dipertahankan untuk kompatibilitas data lama, tetapi default dan data baru diarahkan ke B2B.
- Migrasi `batch_status` memetakan status legacy `collecting` menjadi `submitted`; status legacy tidak ditulis lagi.
- Abstraksi AI dan fallback Gemini tetap ada. Keputusan provider final belum diambil.
- Uji lokal Ollama sebelumnya menunjukkan `OLLAMA_TUNNEL_URL` kosong dan model vision lokal tidak konsisten/lambat untuk classify; jangan lanjut Phase 2 sebelum keputusan provider dikonfirmasi.

## Langkah selanjutnya

1. Menunggu hasil review final Task 0.2.
2. Jalankan `supabase/seed.sql` pada project Supabase aktif dan pastikan tabel `users` terlihat oleh REST schema cache.
3. Buat commit checkpoint terpisah dengan pesan sesuai AGENTS.md setelah review disetujui.
4. Phase 1: isi dan uji `OLLAMA_TUNNEL_URL`, kirim minimal lima foto ke endpoint classify, lalu dokumentasikan latency, validitas JSON, dan deteksi kontaminasi.
5. Putuskan `AI_PROVIDER=ollama` atau fallback `gemini` berdasarkan hasil Phase 1. Jangan mulai Phase 2 sebelum keputusan tersebut dikonfirmasi.
