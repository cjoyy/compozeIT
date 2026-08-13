# CompozeIT – API Contract Documentation

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

// The application accepts B2B waste submissions only.
type TrackType = 'b2b';

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
  track: TrackType;     // must be 'b2b'
}
```

### Response Body (200 OK)

```typescript
interface ClassifyResponse {
  id: string;                           // UUID of created waste_submission
  waste_type: WasteType;
  estimated_weight_kg: number;
  cashback_amount: number;                // estimated_weight_kg * Rp1.000/kg
  user_cashback_balance: number;          // user's balance after this submission
  is_contaminated: boolean;
  contaminant_type: ContaminantType;
  is_food_waste: boolean;               // false when the photo is not food waste
  confidence: number;                   // 0-1
  track: TrackType;
  status: 'pending';
  created_at: string;                   // ISO 8601 timestamp
  b2b_status?: {
    total_pending_kg: number;
    threshold_kg: number;
    threshold_reached: boolean;
  };
  _meta: {
    ai_provider: string;
  };
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
  "cashback_amount": 2500,
  "user_cashback_balance": 12500,
  "is_contaminated": false,
  "contaminant_type": null,
  "is_food_waste": true,
  "confidence": 0.87,
  "track": "b2b",
  "status": "pending",
  "created_at": "2026-08-10T15:30:00.000Z",
  "b2b_status": {
    "total_pending_kg": 2.5,
    "threshold_kg": 50,
    "threshold_reached": false
  },
  "_meta": {
    "ai_provider": "ollama"
  }
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
    batch?: {
      id: string;
      status: BatchStatus;
    };
    processor_match?: {
      processor_id: string;
      processor_name: string;
      distance_km: number;
    };
    created_at: string;
  };
}

type BatchStatus =
  | 'submitted'
  | 'picked_up'
  | 'processing'
  | 'completed'
  | 'sold';

// Batch lifecycle is intentionally simple for the MVP traceability timeline.
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

**Response (200 – threshold met):**
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

**Response (200 – threshold not met):**
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

## 4. POST `/api/cashback/apply`

**Description:** Simulasi penggunaan saldo cashback B2B untuk renewal subscription. Cashback dihitung dari submission REAL dengan asumsi Rp1.000/kg. Fee renewal demo adalah Rp300.000/bulan.

### Request Body

```typescript
interface CashbackApplyRequest {
  user_id: string; // UUID of the B2B user
}
```

### Response Body (200 OK)

```typescript
interface CashbackApplyResponse {
  success: true;
  data: {
    applied: boolean;
    applied_amount?: 300000;
    reason?: 'INSUFFICIENT_BALANCE';
    required_amount?: 300000;
    current_balance?: number;
    remaining_balance: number;
    subscription_status: 'active' | 'renewal_due';
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
  "user_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
}
```

**Response (200 – applied):**
```json
{
  "success": true,
  "data": {
    "applied": true,
    "applied_amount": 300000,
    "remaining_balance": 25000,
    "subscription_status": "active"
  }
}
```

**Response (200 – insufficient balance):**
```json
{
  "success": true,
  "data": {
    "applied": false,
    "reason": "INSUFFICIENT_BALANCE",
    "required_amount": 300000,
    "current_balance": 2500,
    "remaining_balance": 2500,
    "subscription_status": "renewal_due"
  }
}
```

---

## 5. GET/PATCH `/api/batch/:id/timeline`

### GET `/api/batch/:id/timeline` – Batch Timeline

**Description:** Mengambil histori status batch untuk traceability sederhana. Histori berasal dari tabel `batch_status_events`.

#### Response Body (200 OK)

```typescript
interface BatchTimelineResponse {
  success: true;
  data: {
    batch: {
      id: string;
      status: BatchStatus;
      total_weight_kg: number;
      processor_name: string | null;
      created_at: string;
      completed_at: string | null;
    };
    timeline: BatchTimelineEvent[];
  };
}

interface BatchTimelineEvent {
  id: string;
  status: BatchStatus;
  note: string | null;
  created_at: string;
}
```

### PATCH `/api/batch/:id/timeline` – Manual Status Update

**Description:** Endpoint admin sederhana untuk update status batch dan mencatat event timeline baru.

#### Request Body

```typescript
interface BatchTimelineUpdateRequest {
  status: BatchStatus;
  note?: string;
}
```

#### Response Body (200 OK)

```typescript
interface BatchTimelineUpdateResponse {
  success: true;
  data: {
    batch: {
      id: string;
      status: BatchStatus;
      total_weight_kg: number;
      created_at: string;
      completed_at: string | null;
    };
    event: BatchTimelineEvent;
  };
}
```

### Error Responses

| Status | When |
|--------|------|
| 400 | Invalid `status` |
| 404 | Batch not found |
| 500 | Internal server error |

### Example

**PATCH Request:**
```json
{
  "status": "processing",
  "note": "Batch masuk fasilitas EcoCompost Jakarta Selatan."
}
```

---

## 6. GET `/api/marketplace`

### GET `/api/marketplace` – List Read-only Listings

**Description:** Mengambil marketplace listings dari seed data, dengan optional filter. Marketplace Phase 3 adalah mockup read-only; tidak ada endpoint create/update transaction di scope B2B-only demo.

#### Query Parameters

```typescript
interface MarketplaceListParams {
  product_type?: 'compost' | 'bsf';     // filter by product type
  min_stock_kg?: number;                  // minimum stock available
  sort_by?: 'price_per_kg' | 'stock_kg' | 'created_at'; // sort field
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

### Error Responses

| Status | When |
|--------|------|
| 400 | Invalid query parameter |
| 500 | Internal server error |

### Example

**GET Request:**
```
GET /api/marketplace?product_type=compost&min_stock_kg=100&sort_by=price_per_kg&sort_order=asc
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
      "price_per_kg": 12000,
      "stock_kg": 400.0,
      "npk_content": "7-3-5",
      "description": "Kasgot ekonomis – pupuk organik untuk lahan pertanian.",
      "created_at": "2026-08-10T10:00:00.000Z"
    }
  ],
  "total": 1
}
```

---

---

## Notes

1. Semua response menggunakan `Content-Type: application/json`.
2. Semua timestamp dalam format ISO 8601 (UTC).
3. UUID menggunakan format v4.
4. Untuk endpoint yang membutuhkan AI, ada timeout 30 detik per call. Jika provider utama timeout, otomatis fallback ke provider sekunder.
5. Image base64 yang dikirim ke `/api/waste/classify` tidak boleh melebihi 10MB.
