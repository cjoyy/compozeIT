# CompozeIT

CompozeIT adalah platform B2B untuk membantu restoran, hotel, kantin, dan bisnis makanan mengubah sampah makanan menjadi data operasional, cashback, dan jejak pengolahan yang mudah dipahami.

Tagline produk: **Dari limbah menjadi nilai untuk bisnis yang lebih bersih.**

## Mengapa produk ini dibuat?

Bisnis makanan biasanya mengetahui jumlah sampahnya secara kasar, tetapi tidak memiliki cara sederhana untuk:

- mengidentifikasi jenis sampah dan kontaminasinya;
- mencatat berat sampah sebagai data yang konsisten;
- mengetahui status sampah setelah dijemput;
- menghubungkan pengurangan sampah dengan manfaat finansial.

CompozeIT menghubungkan alur tersebut dalam satu dashboard B2B.

## Alur demo utama

```text
Upload foto sampah
        ↓
AI membaca jenis, estimasi berat, dan kontaminasi
        ↓
Submission tersimpan di Supabase
        ↓
Cashback dihitung: estimasi berat × Rp1.000/kg
        ↓
Submission dikumpulkan menjadi batch pickup
        ↓
Batch memiliki status traceability sampai selesai
        ↓
Saldo cashback dapat digunakan untuk simulasi renewal subscription
```

## Status fitur: REAL vs MOCKUP

| Fitur | Status | Penjelasan |
| --- | --- | --- |
| AI waste classification | **REAL** | Vision model membaca foto dan mengembalikan jenis serta estimasi berat. |
| Contamination detection | **REAL** | Model mendeteksi indikasi plastik, logam, kaca, atau kontaminan lain. |
| Cashback loop | **REAL** | Setiap kilogram menghasilkan Rp1.000 cashback dan memperbarui saldo B2B. |
| Digital traceability | **REAL, sederhana** | Status batch dan histori event disimpan di database. |
| Smart logistics | **MOCKUP** | Partner, jarak, status perjalanan, dan ETA adalah data simulasi/seed. |
| Marketplace | **MOCKUP** | Katalog produk read-only dari data seed; belum menjadi transaksi komersial. |
| Compliance report | **MOCKUP** | Ringkasan MBG/ESG ditampilkan dari agregasi demo, belum menghasilkan PDF otomatis. |

## Halaman aplikasi

| Halaman | Kegunaan |
| --- | --- |
| `/` | Landing page dan penjelasan value proposition. |
| `/dashboard` | Ringkasan berat, penghematan, dampak CO₂, cashback, dan histori submission. |
| `/upload` | Upload foto sampah dan melihat hasil analisis AI. |
| `/logistics` | Status pickup dan partner pengolahan berbasis mockup. |
| `/marketplace` | Katalog compost dan produk BSF berbasis seed data. |
| `/compliance` | Ringkasan metrik MBG/ESG untuk kebutuhan demo. |
| `/impact` | Statistik dampak agregat. |
| `/profile` | Profil bisnis B2B dan informasi subscription. |

## Tech stack

- **Next.js 16** App Router dan TypeScript
- **React 19**
- **Tailwind CSS 4** dan komponen UI berbasis shadcn/ui
- **Supabase PostgreSQL** untuk data submission, cashback, batch, processor, dan seed marketplace
- **Vercel** untuk deployment
- **AI provider abstraction** di `src/lib/ai/provider.ts`
- Provider yang tersedia: OpenAI Vision, Gemini Vision, dan Ollama Vision melalui tunnel
- Perhitungan jarak menggunakan Haversine manual; tidak menggunakan Google Maps API

## Menjalankan secara lokal

Persyaratan: Node.js 20+, npm, project Supabase, dan API key provider AI.

```bash
npm install
copy .env.example .env.local
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

Pemeriksaan sebelum commit:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

## Environment variables

> Salin `.env.example` ke `.env.local`. Jangan commit `.env.local` atau API key.

```env
AI_PROVIDER=openai
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini

GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash

OLLAMA_TUNNEL_URL=
OLLAMA_MODEL=qwen3-vl:2b

NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Environment variables Vercel harus diisi pada scope **Production**, tanpa tanda kutip atau newline tersembunyi, lalu deployment harus di-redeploy. `SUPABASE_SERVICE_ROLE_KEY` hanya boleh dipakai server-side.

## Database

Untuk menyiapkan database demo:

1. Buka **Supabase Dashboard → SQL Editor**.
2. Jalankan isi `supabase/seed.sql`.
3. Pastikan RPC berikut terlihat di **Database → Functions**:
   - `create_b2b_waste_submission_with_cashback`
   - `apply_cashback_to_subscription`
   - `create_batch_with_initial_timeline`
   - `update_batch_status_with_timeline`
4. Pastikan user demo tersedia: `d0d0d0d0-0000-4000-8000-000000000001`.

Dokumentasi target schema dan diagram relasi tersedia di [docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) dan [docs/database-schema-erd.svg](docs/database-schema-erd.svg).

## Struktur folder penting

```text
src/app/(b2b)/dashboard        # Ringkasan B2B
src/app/(b2b)/upload            # Upload dan hasil AI
src/app/api/waste/classify     # AI classification + persist Supabase
src/app/api/cashback/apply     # Simulasi renewal cashback
src/app/api/batch/[id]/timeline # Traceability timeline
src/app/api/pickup/trigger     # Trigger batch pickup
src/lib/ai/provider.ts         # Provider AI dan fallback
src/lib/db/supabase.ts         # Client Supabase
supabase/seed.sql              # Schema aktif demo, RPC, dan seed
docs/API_CONTRACT.md           # Kontrak endpoint
docs/DATABASE_SCHEMA.md        # Target production schema dan ERD
```

## API utama

Kontrak lengkap request, response, dan error tersedia di [docs/API_CONTRACT.md](docs/API_CONTRACT.md).

| Method | Endpoint | Fungsi |
| --- | --- | --- |
| `POST` | `/api/waste/classify` | Analisis foto, simpan submission, dan tambah cashback. |
| `POST` | `/api/pickup/trigger` | Cek threshold 50 kg dan membuat batch pickup. |
| `GET` | `/api/waste/submissions` | Mengambil histori submission B2B. |
| `POST` | `/api/cashback/apply` | Simulasi renewal dengan saldo cashback. |
| `GET/PATCH` | `/api/batch/:id/timeline` | Membaca atau memperbarui status batch. |
| `POST` | `/api/matching/find` | Mencari processor terdekat secara Haversine. |
| `GET` | `/api/marketplace` | Membaca katalog marketplace mockup. |
| `GET` | `/api/impact` | Mengambil metrik dampak agregat. |

Contoh request classify:

```bash
curl -X POST http://localhost:3000/api/waste/classify \
  -H "Content-Type: application/json" \
  -d '{"image":"BASE64_IMAGE","user_id":"d0d0d0d0-0000-4000-8000-000000000001","track":"b2b"}'
```

Response sukses berisi `waste_type`, `estimated_weight_kg`, `is_contaminated`, `cashback_amount`, `user_cashback_balance`, dan `_meta.ai_provider`.

## Cara demo ke juri

1. Buka `/upload`.
2. Pilih foto di `public/samples/food-waste/`.
3. Tunjukkan hasil AI: jenis sampah, berat, confidence, dan kontaminasi.
4. Tunjukkan cashback yang masuk ke dashboard.
5. Tunjukkan `/logistics` sebagai simulasi pickup partner.
6. Tunjukkan timeline batch untuk menjelaskan traceability.
7. Tunjukkan `/marketplace` dan `/compliance`, sambil menyebutkan dengan jujur bahwa keduanya masih mockup berbasis seed.

## Troubleshooting singkat

### `Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL`

Periksa `NEXT_PUBLIC_SUPABASE_URL` di Vercel Production. Nilainya harus seperti `https://project-id.supabase.co`, tanpa tanda kutip, URL dashboard, atau `localhost`. Setelah mengubah variable, redeploy.

### `No API key found in request` saat membuka `/rest/v1`

Itu normal jika endpoint dibuka tanpa header. REST API memerlukan header `apikey`; aplikasi mengirimkannya melalui Supabase client.

### `UNPARSEABLE_AI_RESPONSE`

Provider AI gagal menghasilkan JSON yang sesuai. Periksa `AI_PROVIDER`, API key, model, dan log Vercel. Provider abstraction mencoba fallback jika provider sekunder dikonfigurasi.

### Dashboard menampilkan data contoh demo

Dashboard memakai fixture lokal ketika Supabase tidak tersedia atau belum memiliki submission. Label “Ringkasan contoh demo” menandai kondisi tersebut agar angka tidak disalahartikan sebagai data production.

## Keamanan dan batasan MVP

- API key tidak boleh diletakkan di client component atau repository.
- Service role key hanya digunakan di route server.
- Foto base64 dibatasi sekitar 10 MB.
- Marketplace dan logistics tidak boleh dipresentasikan sebagai transaksi atau GPS real-time.
- Schema target production di `docs/DATABASE_SCHEMA.md` belum menggantikan schema demo secara otomatis; migrasi production harus dilakukan bertahap dan tidak destruktif.

## Lisensi

Project ini dibuat sebagai MVP/hackathon prototype CompozeIT.
