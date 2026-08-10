-- CompozeIT — Supabase Schema & Seed Data
-- Run this in the Supabase SQL Editor to initialize the database

-- ============================================================
-- ENUM TYPES
-- ============================================================

DO $$ BEGIN
  CREATE TYPE user_type AS ENUM ('b2b', 'b2c');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE waste_type AS ENUM ('nasi', 'sayur', 'protein', 'buah', 'campuran', 'lainnya');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE track_type AS ENUM ('sell', 'diy', 'b2b');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE submission_status AS ENUM ('pending', 'pickup_scheduled', 'picked_up', 'processing', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE processor_type AS ENUM ('compost', 'bsf');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE batch_status AS ENUM ('collecting', 'processing', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE product_type AS ENUM ('compost', 'bsf');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE transaction_status AS ENUM ('pending', 'confirmed', 'shipped', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE contaminant_type AS ENUM ('plastik', 'logam', 'kaca', 'lainnya');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- TABLES
-- ============================================================

-- 1. Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type user_type NOT NULL DEFAULT 'b2c',
  business_name TEXT,                         -- nullable, only for B2B
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Waste Submissions
CREATE TABLE IF NOT EXISTS waste_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  photo_url TEXT,                              -- Supabase Storage URL
  waste_type waste_type,
  estimated_weight_kg NUMERIC(8,2),
  is_contaminated BOOLEAN DEFAULT false,
  contaminant_type contaminant_type,
  confidence NUMERIC(3,2),                    -- 0.00 - 1.00
  track track_type NOT NULL,
  status submission_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Processors
CREATE TABLE IF NOT EXISTS processors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type processor_type NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  capacity_kg NUMERIC(10,2) NOT NULL,
  current_load_kg NUMERIC(10,2) NOT NULL DEFAULT 0,
  accepted_waste_types waste_type[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Batches
CREATE TABLE IF NOT EXISTS batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processor_id UUID NOT NULL REFERENCES processors(id) ON DELETE CASCADE,
  total_weight_kg NUMERIC(10,2) NOT NULL DEFAULT 0,
  status batch_status NOT NULL DEFAULT 'collecting',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- 5. Batch Submissions (junction table)
CREATE TABLE IF NOT EXISTS batch_submissions (
  batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES waste_submissions(id) ON DELETE CASCADE,
  PRIMARY KEY (batch_id, submission_id)
);

-- 6. Marketplace Listings
CREATE TABLE IF NOT EXISTS marketplace_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processor_id UUID NOT NULL REFERENCES processors(id) ON DELETE CASCADE,
  product_type product_type NOT NULL,
  price_per_kg NUMERIC(10,0) NOT NULL,        -- IDR, no decimals
  stock_kg NUMERIC(10,2) NOT NULL DEFAULT 0,
  npk_content TEXT,                           -- e.g. "12-5-8"
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  buyer_name TEXT NOT NULL,
  buyer_contact TEXT NOT NULL,                -- phone or email
  quantity_kg NUMERIC(10,2) NOT NULL,
  status transaction_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_waste_submissions_user_id ON waste_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_waste_submissions_status ON waste_submissions(status);
CREATE INDEX IF NOT EXISTS idx_processors_type ON processors(type);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_product_type ON marketplace_listings(product_type);
CREATE INDEX IF NOT EXISTS idx_transactions_listing_id ON transactions(listing_id);

-- ============================================================
-- SEED DATA: Processors (8-10 di Jabodetabek)
-- ============================================================

INSERT INTO processors (id, name, type, lat, lng, capacity_kg, current_load_kg, accepted_waste_types) VALUES
  -- Jakarta
  ('a1b2c3d4-1111-4000-8000-000000000001', 'EcoCompost Jakarta Selatan', 'compost', -6.2615, 106.8106, 500.00, 120.00, '{nasi,sayur,buah,campuran}'),
  ('a1b2c3d4-1111-4000-8000-000000000002', 'BSF Farm Cakung', 'bsf', -6.1752, 106.9547, 800.00, 350.00, '{protein,sayur,campuran,lainnya}'),
  ('a1b2c3d4-1111-4000-8000-000000000003', 'GreenCycle Composting Kebayoran', 'compost', -6.2442, 106.7830, 300.00, 80.00, '{nasi,sayur,buah}'),
  
  -- Bogor
  ('a1b2c3d4-1111-4000-8000-000000000004', 'Maggot Farm Cibinong', 'bsf', -6.4818, 106.8513, 1000.00, 600.00, '{protein,sayur,campuran,nasi,lainnya}'),
  ('a1b2c3d4-1111-4000-8000-000000000005', 'BogorCompost Sentul', 'compost', -6.5863, 106.8493, 400.00, 50.00, '{sayur,buah,nasi}'),
  
  -- Depok
  ('a1b2c3d4-1111-4000-8000-000000000006', 'Depok Circular Hub', 'compost', -6.3923, 106.8239, 350.00, 200.00, '{nasi,sayur,buah,campuran}'),
  
  -- Tangerang
  ('a1b2c3d4-1111-4000-8000-000000000007', 'BSF Tangerang Selatan', 'bsf', -6.3384, 106.6796, 600.00, 280.00, '{protein,sayur,campuran}'),
  ('a1b2c3d4-1111-4000-8000-000000000008', 'TangerangCompost Bintaro', 'compost', -6.2757, 106.7133, 250.00, 100.00, '{nasi,sayur,buah}'),
  
  -- Bekasi
  ('a1b2c3d4-1111-4000-8000-000000000009', 'Bekasi Maggot Center', 'bsf', -6.2383, 107.0000, 700.00, 450.00, '{protein,sayur,campuran,nasi,lainnya}'),
  ('a1b2c3d4-1111-4000-8000-000000000010', 'EcoFarm Cikarang', 'compost', -6.2553, 107.1486, 500.00, 150.00, '{nasi,sayur,buah,campuran}')

ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SEED DATA: Marketplace Listings (15 terkait ke processors)
-- ============================================================

INSERT INTO marketplace_listings (id, processor_id, product_type, price_per_kg, stock_kg, npk_content, description) VALUES
  -- Dari EcoCompost Jakarta Selatan
  ('b2c3d4e5-2222-4000-8000-000000000001', 'a1b2c3d4-1111-4000-8000-000000000001', 'compost', 3500, 200.00, '12-5-8', 'Kompos premium dari sisa makanan restoran Jakarta Selatan. Sudah difermentasi 30 hari.'),
  ('b2c3d4e5-2222-4000-8000-000000000002', 'a1b2c3d4-1111-4000-8000-000000000001', 'compost', 2500, 150.00, '8-3-6', 'Kompos standar untuk tanaman hias dan kebun rumah.'),
  
  -- Dari BSF Farm Cakung
  ('b2c3d4e5-2222-4000-8000-000000000003', 'a1b2c3d4-1111-4000-8000-000000000002', 'bsf', 25000, 50.00, NULL, 'Larva BSF kering — pakan ikan lele & unggas. Protein 42%.'),
  ('b2c3d4e5-2222-4000-8000-000000000004', 'a1b2c3d4-1111-4000-8000-000000000002', 'bsf', 15000, 80.00, NULL, 'Kasgot (kascing maggot) — pupuk organik dari residu BSF.'),
  
  -- Dari GreenCycle Kebayoran
  ('b2c3d4e5-2222-4000-8000-000000000005', 'a1b2c3d4-1111-4000-8000-000000000003', 'compost', 4000, 100.00, '14-6-10', 'Kompos super — diperkaya dengan mikroorganisme tanah aktif.'),
  
  -- Dari Maggot Farm Cibinong
  ('b2c3d4e5-2222-4000-8000-000000000006', 'a1b2c3d4-1111-4000-8000-000000000004', 'bsf', 22000, 120.00, NULL, 'Tepung larva BSF untuk campuran pelet ikan. Kadar protein 40%.'),
  ('b2c3d4e5-2222-4000-8000-000000000007', 'a1b2c3d4-1111-4000-8000-000000000004', 'bsf', 18000, 90.00, NULL, 'Minyak larva BSF — bahan baku biodiesel dan pakan ternak.'),
  ('b2c3d4e5-2222-4000-8000-000000000008', 'a1b2c3d4-1111-4000-8000-000000000004', 'compost', 3000, 300.00, '10-4-7', 'Frass BSF — pupuk organik kaya nitrogen dari sisa proses BSF.'),
  
  -- Dari BogorCompost Sentul
  ('b2c3d4e5-2222-4000-8000-000000000009', 'a1b2c3d4-1111-4000-8000-000000000005', 'compost', 2800, 250.00, '9-4-6', 'Kompos sayur-buah murni. Cocok untuk urban farming.'),
  
  -- Dari Depok Circular Hub
  ('b2c3d4e5-2222-4000-8000-000000000010', 'a1b2c3d4-1111-4000-8000-000000000006', 'compost', 3200, 180.00, '11-5-8', 'Kompos campuran food waste dapur. Sudah disertifikasi SNI.'),
  
  -- Dari BSF Tangerang Selatan
  ('b2c3d4e5-2222-4000-8000-000000000011', 'a1b2c3d4-1111-4000-8000-000000000007', 'bsf', 28000, 35.00, NULL, 'Larva BSF segar — langsung dari farm, untuk pakan lele premium.'),
  ('b2c3d4e5-2222-4000-8000-000000000012', 'a1b2c3d4-1111-4000-8000-000000000007', 'compost', 2000, 400.00, '7-3-5', 'Kasgot ekonomis — pupuk organik untuk lahan pertanian.'),
  
  -- Dari TangerangCompost Bintaro
  ('b2c3d4e5-2222-4000-8000-000000000013', 'a1b2c3d4-1111-4000-8000-000000000008', 'compost', 3800, 90.00, '13-5-9', 'Kompos premium Bintaro — dari sisa restoran dan cafe area BSD.'),
  
  -- Dari Bekasi Maggot Center
  ('b2c3d4e5-2222-4000-8000-000000000014', 'a1b2c3d4-1111-4000-8000-000000000009', 'bsf', 20000, 70.00, NULL, 'Larva BSF kering grade A — standar ekspor pakan ternak.'),
  
  -- Dari EcoFarm Cikarang
  ('b2c3d4e5-2222-4000-8000-000000000015', 'a1b2c3d4-1111-4000-8000-000000000010', 'compost', 3000, 220.00, '10-4-8', 'Kompos industrial — bulk order untuk perkebunan dan nursery.')

ON CONFLICT (id) DO NOTHING;
