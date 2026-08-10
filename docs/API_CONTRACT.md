# CompozeIT — API Contract Documentation

> Dokumen ini adalah single source of truth untuk semua endpoint API. **Selalu cek dokumen ini sebelum membuat keputusan struktur data/API baru.**

---

## Common Types

```typescript
// Shared error response shape for all endpoints
interface ErrorResponse {
  error: string;
  message: string;
  details?: string;
}

// Waste types recognized by the system
type WasteType = 'nasi' | 'sayur' | 'protein' | 'buah' | 'campuran' | 'lainnya';

// Track options for waste submission
type TrackType = 'sell' | 'diy' | 'b2b';

// Contaminant types
type ContaminantType = 'plastik' | 'logam' | 'kaca' | 'lainnya' | null;
```

---

## 1. POST `/api/waste/classify`

**Description:** Menerima foto sampah makanan, mengklasifikasi jenis waste, estimasi berat, dan deteksi kontaminasi menggunakan AI vision model.

### Request Body

```typescript
interface ClassifyRequest {
  image: string;        // base64-encoded image (JPEG/PNG)
  user_id: string;      // UUID of the user
  track: TrackType;     // which track: 'sell', 'diy', or 'b2b'
}
```

### Response Body (200 OK)

```typescript
interface ClassifyResponse {
  id: string;                           // UUID of created waste_submission
  waste_type: WasteType;
  estimated_weight_kg: number;
  is_contaminated: boolean;
  contaminant_type: ContaminantType;
  confidence: number;                   // 0-1
  track: TrackType;
  created_at: string;                   // ISO 8601 timestamp
}
```

### Error Responses

| Status | When |
|--------|------|
| 400 | Missing/invalid `image`, `user_id`, or `track` |
| 422 | AI returned unparseable response (after 1 retry) |
| 500 | Internal server error (DB write failure, provider unavailable) |

### Example

**Request:**
```json
{
  "image": "/9j/4AAQSkZJRgABAQ...base64data...",
  "user_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "track": "b2b"
}
```

**Response (200):**
```json
{
  "id": "d290f1ee-6c54-4b01-90e6-d701748f0851",
  "waste_type": "sayur",
  "estimated_weight_kg": 2.5,
  "is_contaminated": false,
  "contaminant_type": null,
  "confidence": 0.87,
  "track": "b2b",
  "created_at": "2026-08-10T15:30:00.000Z"
}
```

**Error (422):**
```json
{
  "error": "UNPARSEABLE_AI_RESPONSE",
  "message": "AI model returned invalid JSON after retry",
  "details": "Expected JSON with fields: waste_type, estimated_weight_kg, is_contaminated, contaminant_type, confidence"
}
```

---

## 2. POST `/api/pickup/trigger`

**Description:** Cek apakah akumulasi waste user sudah mencapai threshold (default: 50 kg). Jika ya, generate pickup order.

### Request Body

```typescript
interface PickupTriggerRequest {
  user_id: string;       // UUID of the B2B user
  threshold_kg?: number; // optional, default 50
}
```

### Response Body (200 OK)

```typescript
interface PickupTriggerResponse {
  triggered: boolean;
  total_pending_kg: number;
  threshold_kg: number;
  pickup_order?: {
    id: string;                    // UUID of generated pickup order
    submissions: string[];         // UUIDs of waste_submissions included
    estimated_total_kg: number;
    processor_match?: {
      processor_id: string;
      processor_name: string;
      distance_km: number;
    };
    created_at: string;
  };
}
```

### Error Responses

| Status | When |
|--------|------|
| 400 | Missing/invalid `user_id` |
| 404 | User not found or user is not B2B type |
| 500 | Internal server error |

### Example

**Request:**
```json
{
  "user_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "threshold_kg": 50
}
```

**Response (200 — threshold met):**
```json
{
  "triggered": true,
  "total_pending_kg": 62.5,
  "threshold_kg": 50,
  "pickup_order": {
    "id": "c1d2e3f4-5678-4000-8000-000000000001",
    "submissions": [
      "d290f1ee-6c54-4b01-90e6-d701748f0851",
      "a1b2c3d4-5678-4000-8000-000000000002"
    ],
    "estimated_total_kg": 62.5,
    "processor_match": {
      "processor_id": "a1b2c3d4-1111-4000-8000-000000000001",
      "processor_name": "EcoCompost Jakarta Selatan",
      "distance_km": 3.2
    },
    "created_at": "2026-08-10T15:35:00.000Z"
  }
}
```

**Response (200 — threshold not met):**
```json
{
  "triggered": false,
  "total_pending_kg": 28.0,
  "threshold_kg": 50,
}
```

---

## 3. POST `/api/matching/find`

**Description:** Cari processor terdekat yang cocok berdasarkan lokasi, jenis waste, dan kapasitas tersedia. Mengembalikan daftar terurut berdasarkan skor (jarak + kapasitas + jenis waste).

### Request Body

```typescript
interface MatchingFindRequest {
  lat: number;           // latitude of the waste generator
  lng: number;           // longitude of the waste generator
  waste_type: WasteType;
  weight_kg?: number;    // optional, to filter by available capacity
}
```

### Response Body (200 OK)

```typescript
interface MatchingFindResponse {
  matches: ProcessorMatch[];
}

interface ProcessorMatch {
  processor_id: string;
  name: string;
  type: 'compost' | 'bsf';
  distance_km: number;          // haversine distance
  available_capacity_kg: number; // capacity_kg - current_load_kg
  score: number;                 // composite score (lower = better)
  accepts_waste_type: boolean;
}
```

### Scoring Formula

```
score = (distance_weight * normalized_distance)
      + (capacity_weight * (1 - normalized_available_capacity))
      + (type_penalty if waste_type not in accepted_waste_types)

Default weights: distance=0.5, capacity=0.3, type_penalty=0.2
```

### Error Responses

| Status | When |
|--------|------|
| 400 | Missing/invalid `lat`, `lng`, or `waste_type` |
| 404 | No processors found |
| 500 | Internal server error |

### Example

**Request:**
```json
{
  "lat": -6.2088,
  "lng": 106.8456,
  "waste_type": "sayur",
  "weight_kg": 30
}
```

**Response (200):**
```json
{
  "matches": [
    {
      "processor_id": "a1b2c3d4-1111-4000-8000-000000000001",
      "name": "EcoCompost Jakarta Selatan",
      "type": "compost",
      "distance_km": 5.8,
      "available_capacity_kg": 380.0,
      "score": 0.23,
      "accepts_waste_type": true
    },
    {
      "processor_id": "a1b2c3d4-1111-4000-8000-000000000003",
      "name": "GreenCycle Composting Kebayoran",
      "type": "compost",
      "distance_km": 7.1,
      "available_capacity_kg": 220.0,
      "score": 0.35,
      "accepts_waste_type": true
    }
  ]
}
```

---

## 4. GET/POST `/api/marketplace`

### GET `/api/marketplace` — List Listings

**Description:** Mengambil semua marketplace listings, dengan optional filter.

#### Query Parameters

```typescript
interface MarketplaceListParams {
  product_type?: 'compost' | 'bsf';     // filter by product type
  min_stock_kg?: number;                  // minimum stock available
  sort_by?: 'price' | 'stock' | 'created_at'; // sort field
  sort_order?: 'asc' | 'desc';           // sort direction (default: desc)
  limit?: number;                          // pagination (default: 20)
  offset?: number;                         // pagination (default: 0)
}
```

#### Response Body (200 OK)

```typescript
interface MarketplaceListResponse {
  listings: MarketplaceListing[];
  total: number;
}

interface MarketplaceListing {
  id: string;
  processor_id: string;
  processor_name: string;
  product_type: 'compost' | 'bsf';
  price_per_kg: number;          // IDR
  stock_kg: number;
  npk_content: string | null;
  description: string | null;
  created_at: string;
}
```

### POST `/api/marketplace` — Create Listing

**Description:** Buat marketplace listing baru (oleh processor).

#### Request Body

```typescript
interface MarketplaceCreateRequest {
  processor_id: string;
  product_type: 'compost' | 'bsf';
  price_per_kg: number;
  stock_kg: number;
  npk_content?: string;
  description?: string;
}
```

#### Response Body (201 Created)

```typescript
interface MarketplaceCreateResponse {
  id: string;
  processor_id: string;
  product_type: 'compost' | 'bsf';
  price_per_kg: number;
  stock_kg: number;
  npk_content: string | null;
  description: string | null;
  created_at: string;
}
```

### Error Responses

| Status | When |
|--------|------|
| 400 | Missing required fields in POST body |
| 404 | Processor not found (POST) |
| 500 | Internal server error |

### Example

**GET Request:**
```
GET /api/marketplace?product_type=compost&min_stock_kg=100&sort_by=price&sort_order=asc
```

**GET Response (200):**
```json
{
  "listings": [
    {
      "id": "b2c3d4e5-2222-4000-8000-000000000012",
      "processor_id": "a1b2c3d4-1111-4000-8000-000000000007",
      "processor_name": "BSF Tangerang Selatan",
      "product_type": "compost",
      "price_per_kg": 2000,
      "stock_kg": 400.0,
      "npk_content": "7-3-5",
      "description": "Kasgot ekonomis — pupuk organik untuk lahan pertanian.",
      "created_at": "2026-08-10T10:00:00.000Z"
    }
  ],
  "total": 1
}
```

**POST Request:**
```json
{
  "processor_id": "a1b2c3d4-1111-4000-8000-000000000001",
  "product_type": "compost",
  "price_per_kg": 3500,
  "stock_kg": 200,
  "npk_content": "12-5-8",
  "description": "Kompos premium dari sisa makanan restoran"
}
```

**POST Response (201):**
```json
{
  "id": "b2c3d4e5-2222-4000-8000-000000000016",
  "processor_id": "a1b2c3d4-1111-4000-8000-000000000001",
  "product_type": "compost",
  "price_per_kg": 3500,
  "stock_kg": 200.0,
  "npk_content": "12-5-8",
  "description": "Kompos premium dari sisa makanan restoran",
  "created_at": "2026-08-10T16:00:00.000Z"
}
```

---

## 5. POST `/api/waste/diy-guide`

**Description:** Berikan panduan DIY self-composting dan rekomendasi tanaman berdasarkan jenis waste. Menggunakan AI text generation.

### Request Body

```typescript
interface DIYGuideRequest {
  waste_type: WasteType;
  weight_kg?: number;       // optional context for the AI
}
```

### Response Body (200 OK)

```typescript
interface DIYGuideResponse {
  waste_type: WasteType;
  guide: {
    title: string;
    steps: string[];          // ordered list of composting steps
    duration_days: number;    // estimated composting duration
    tips: string[];           // additional tips
  };
  recommended_plants: {
    name: string;
    reason: string;
  }[];
}
```

### Error Responses

| Status | When |
|--------|------|
| 400 | Missing/invalid `waste_type` |
| 500 | AI provider error or internal server error |

### Example

**Request:**
```json
{
  "waste_type": "sayur",
  "weight_kg": 2.0
}
```

**Response (200):**
```json
{
  "waste_type": "sayur",
  "guide": {
    "title": "Panduan Kompos dari Sisa Sayuran",
    "steps": [
      "Potong sisa sayuran menjadi ukuran kecil (2-3 cm) untuk mempercepat dekomposisi.",
      "Siapkan wadah kompos dengan lubang aerasi di bagian bawah dan samping.",
      "Letakkan lapisan pertama: material kering (daun kering, serutan kayu, kardus) setebal 5 cm.",
      "Tambahkan sisa sayuran sebagai lapisan hijau (nitrogen-rich).",
      "Tutup dengan lapisan cokelat (material kering) lagi.",
      "Semprot air hingga lembap (seperti spons yang diperas).",
      "Aduk setiap 3-4 hari untuk aerasi.",
      "Kompos siap pakai dalam 30-45 hari ketika berwarna gelap, berbau tanah, dan tekstur remah."
    ],
    "duration_days": 35,
    "tips": [
      "Hindari memasukkan sayuran yang sudah terkontaminasi minyak goreng berlebih.",
      "Rasio ideal: 3 bagian cokelat (karbon) : 1 bagian hijau (nitrogen).",
      "Jaga kelembapan — terlalu basah menyebabkan bau, terlalu kering memperlambat proses."
    ]
  },
  "recommended_plants": [
    {
      "name": "Kangkung",
      "reason": "Tumbuh cepat dan menyukai tanah kaya nitrogen dari kompos sayuran."
    },
    {
      "name": "Bayam",
      "reason": "Cocok dengan kompos sayur yang kaya nutrisi, panen dalam 25-30 hari."
    },
    {
      "name": "Tomat Cherry",
      "reason": "Responsif terhadap kompos organik, cocok untuk pot di rumah."
    }
  ]
}
```

---

## Notes

1. Semua response menggunakan `Content-Type: application/json`.
2. Semua timestamp dalam format ISO 8601 (UTC).
3. UUID menggunakan format v4.
4. Untuk endpoint yang membutuhkan AI, ada timeout 30 detik per call. Jika provider utama timeout, otomatis fallback ke provider sekunder.
5. Image base64 yang dikirim ke `/api/waste/classify` tidak boleh melebihi 10MB.
