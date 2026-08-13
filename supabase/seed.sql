-- CompozeIT – Supabase Schema & Seed Data
-- Run this in the Supabase SQL Editor to initialize the database

-- ============================================================
-- ENUM TYPES
-- ============================================================

DO $$ BEGIN
  CREATE TYPE user_type AS ENUM ('b2b', 'b2c');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('active', 'renewal_due');
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
  CREATE TYPE batch_status AS ENUM ('submitted', 'picked_up', 'processing', 'completed', 'sold');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'batch_status' AND e.enumlabel = 'collecting'
  ) THEN
    IF to_regclass('public.batches') IS NOT NULL THEN
      ALTER TABLE batches ALTER COLUMN status DROP DEFAULT;
      ALTER TYPE batch_status RENAME TO batch_status_old;
      CREATE TYPE batch_status AS ENUM ('submitted', 'picked_up', 'processing', 'completed', 'sold');
      ALTER TABLE batches
        ALTER COLUMN status TYPE batch_status
        USING (
          CASE status::text
            WHEN 'collecting' THEN 'submitted'
            ELSE status::text
          END
        )::batch_status;
      ALTER TABLE batches ALTER COLUMN status SET DEFAULT 'submitted';
      DROP TYPE batch_status_old;
    ELSE
      ALTER TYPE batch_status RENAME TO batch_status_old;
      CREATE TYPE batch_status AS ENUM ('submitted', 'picked_up', 'processing', 'completed', 'sold');
      DROP TYPE batch_status_old;
    END IF;
  END IF;
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
  type user_type NOT NULL DEFAULT 'b2b',
  business_name TEXT,                         -- nullable, only for B2B
  subscription_status subscription_status NOT NULL DEFAULT 'active',
  total_cashback_balance NUMERIC(10,2) NOT NULL DEFAULT 0,
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
  cashback_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_contaminated BOOLEAN DEFAULT false,
  contaminant_type contaminant_type,
  confidence NUMERIC(3,2),                    -- 0.00 - 1.00
  -- Legacy enum values remain for existing rows; new submissions are B2B by default.
  track track_type NOT NULL DEFAULT 'b2b',
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
  status batch_status NOT NULL DEFAULT 'submitted',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- 5. Batch Status Events
CREATE TABLE IF NOT EXISTS batch_status_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  status batch_status NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- MIGRATIONS FOR EXISTING DATABASES
-- ============================================================

ALTER TABLE users
  ALTER COLUMN type SET DEFAULT 'b2b',
  ADD COLUMN IF NOT EXISTS subscription_status subscription_status NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS total_cashback_balance NUMERIC(10,2) NOT NULL DEFAULT 0;

ALTER TABLE waste_submissions
  ADD COLUMN IF NOT EXISTS cashback_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  ALTER COLUMN track SET DEFAULT 'b2b';

-- Existing B2C rows are migrated into the single supported B2B track.
UPDATE waste_submissions
SET track = 'b2b'
WHERE track::text IN ('sell', 'diy');

-- 6. Batch Submissions (junction table)
CREATE TABLE IF NOT EXISTS batch_submissions (
  batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES waste_submissions(id) ON DELETE CASCADE,
  PRIMARY KEY (batch_id, submission_id)
);

-- 7. Marketplace Listings
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

-- 8. Transactions
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
CREATE INDEX IF NOT EXISTS idx_batch_status_events_batch_id ON batch_status_events(batch_id);
CREATE INDEX IF NOT EXISTS idx_processors_type ON processors(type);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_product_type ON marketplace_listings(product_type);
CREATE INDEX IF NOT EXISTS idx_transactions_listing_id ON transactions(listing_id);

-- ============================================================
-- RPC FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION create_b2b_waste_submission_with_cashback(
  p_user_id UUID,
  p_waste_type waste_type,
  p_estimated_weight_kg NUMERIC,
  p_cashback_amount NUMERIC,
  p_is_contaminated BOOLEAN,
  p_contaminant_type contaminant_type,
  p_confidence NUMERIC,
  p_track track_type,
  p_status submission_status
)
RETURNS TABLE (
  id UUID,
  waste_type waste_type,
  estimated_weight_kg NUMERIC,
  cashback_amount NUMERIC,
  is_contaminated BOOLEAN,
  contaminant_type contaminant_type,
  confidence NUMERIC,
  track track_type,
  status submission_status,
  created_at TIMESTAMPTZ,
  user_cashback_balance NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  inserted_submission waste_submissions%ROWTYPE;
  updated_balance NUMERIC;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM users WHERE users.id = p_user_id AND users.type = 'b2b'
  ) THEN
    RAISE EXCEPTION 'B2B user not found';
  END IF;

  INSERT INTO waste_submissions (
    user_id,
    waste_type,
    estimated_weight_kg,
    cashback_amount,
    is_contaminated,
    contaminant_type,
    confidence,
    track,
    status
  )
  VALUES (
    p_user_id,
    p_waste_type,
    p_estimated_weight_kg,
    p_cashback_amount,
    p_is_contaminated,
    p_contaminant_type,
    p_confidence,
    p_track,
    p_status
  )
  RETURNING * INTO inserted_submission;

  UPDATE users
  SET total_cashback_balance = ROUND(total_cashback_balance + p_cashback_amount, 2)
  WHERE users.id = p_user_id
  RETURNING total_cashback_balance INTO updated_balance;

  RETURN QUERY SELECT
    inserted_submission.id,
    inserted_submission.waste_type,
    inserted_submission.estimated_weight_kg,
    inserted_submission.cashback_amount,
    inserted_submission.is_contaminated,
    inserted_submission.contaminant_type,
    inserted_submission.confidence,
    inserted_submission.track,
    inserted_submission.status,
    inserted_submission.created_at,
    updated_balance;
END;
$$;

CREATE OR REPLACE FUNCTION apply_cashback_to_subscription(
  p_user_id UUID,
  p_subscription_fee NUMERIC
)
RETURNS TABLE (
  applied BOOLEAN,
  reason TEXT,
  required_amount NUMERIC,
  current_balance NUMERIC,
  remaining_balance NUMERIC,
  subscription_status subscription_status
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  locked_user users%ROWTYPE;
BEGIN
  SELECT *
  INTO locked_user
  FROM users
  WHERE users.id = p_user_id AND users.type = 'b2b'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'B2B user not found';
  END IF;

  IF locked_user.total_cashback_balance < p_subscription_fee THEN
    UPDATE users
    SET subscription_status = 'renewal_due'
    WHERE users.id = p_user_id
    RETURNING users.total_cashback_balance, users.subscription_status
    INTO remaining_balance, subscription_status;

    applied := false;
    reason := 'INSUFFICIENT_BALANCE';
    required_amount := p_subscription_fee;
    current_balance := locked_user.total_cashback_balance;
    RETURN NEXT;
    RETURN;
  END IF;

  UPDATE users
  SET
    total_cashback_balance = ROUND(total_cashback_balance - p_subscription_fee, 2),
    subscription_status = 'active'
  WHERE users.id = p_user_id
  RETURNING users.total_cashback_balance, users.subscription_status
  INTO remaining_balance, subscription_status;

  applied := true;
  reason := NULL;
  required_amount := p_subscription_fee;
  current_balance := locked_user.total_cashback_balance;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION create_batch_with_initial_timeline(
  p_processor_id UUID,
  p_total_weight_kg NUMERIC,
  p_note TEXT
)
RETURNS TABLE (
  id UUID,
  status batch_status,
  total_weight_kg NUMERIC,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  inserted_batch batches%ROWTYPE;
BEGIN
  INSERT INTO batches (processor_id, total_weight_kg, status)
  VALUES (p_processor_id, p_total_weight_kg, 'submitted')
  RETURNING * INTO inserted_batch;

  INSERT INTO batch_status_events (batch_id, status, note)
  VALUES (inserted_batch.id, 'submitted', p_note);

  RETURN QUERY SELECT
    inserted_batch.id,
    inserted_batch.status,
    inserted_batch.total_weight_kg,
    inserted_batch.created_at;
END;
$$;

CREATE OR REPLACE FUNCTION update_batch_status_with_timeline(
  p_batch_id UUID,
  p_status batch_status,
  p_note TEXT,
  p_completed_at TIMESTAMPTZ
)
RETURNS TABLE (
  batch_id UUID,
  batch_status batch_status,
  batch_total_weight_kg NUMERIC,
  batch_created_at TIMESTAMPTZ,
  batch_completed_at TIMESTAMPTZ,
  event_id UUID,
  event_status batch_status,
  event_note TEXT,
  event_created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_batch batches%ROWTYPE;
  inserted_event batch_status_events%ROWTYPE;
BEGIN
  UPDATE batches
  SET status = p_status, completed_at = p_completed_at
  WHERE batches.id = p_batch_id
  RETURNING * INTO updated_batch;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Batch not found';
  END IF;

  INSERT INTO batch_status_events (batch_id, status, note)
  VALUES (p_batch_id, p_status, p_note)
  RETURNING * INTO inserted_event;

  RETURN QUERY SELECT
    updated_batch.id,
    updated_batch.status,
    updated_batch.total_weight_kg,
    updated_batch.created_at,
    updated_batch.completed_at,
    inserted_event.id,
    inserted_event.status,
    inserted_event.note,
    inserted_event.created_at;
END;
$$;

INSERT INTO batch_status_events (batch_id, status, note, created_at)
SELECT
  batches.id,
  batches.status,
  'Backfill event dari status batch yang sudah ada sebelum timeline aktif.',
  batches.created_at
FROM batches
WHERE NOT EXISTS (
  SELECT 1
  FROM batch_status_events
  WHERE batch_status_events.batch_id = batches.id
);

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
  ('b2c3d4e5-2222-4000-8000-000000000003', 'a1b2c3d4-1111-4000-8000-000000000002', 'bsf', 25000, 50.00, NULL, 'Larva BSF kering – pakan ikan lele & unggas. Protein 42%.'),
  ('b2c3d4e5-2222-4000-8000-000000000004', 'a1b2c3d4-1111-4000-8000-000000000002', 'bsf', 15000, 80.00, NULL, 'Kasgot (kascing maggot) – pupuk organik dari residu BSF.'),
  
  -- Dari GreenCycle Kebayoran
  ('b2c3d4e5-2222-4000-8000-000000000005', 'a1b2c3d4-1111-4000-8000-000000000003', 'compost', 4000, 100.00, '14-6-10', 'Kompos super – diperkaya dengan mikroorganisme tanah aktif.'),
  
  -- Dari Maggot Farm Cibinong
  ('b2c3d4e5-2222-4000-8000-000000000006', 'a1b2c3d4-1111-4000-8000-000000000004', 'bsf', 22000, 120.00, NULL, 'Tepung larva BSF untuk campuran pelet ikan. Kadar protein 40%.'),
  ('b2c3d4e5-2222-4000-8000-000000000007', 'a1b2c3d4-1111-4000-8000-000000000004', 'bsf', 18000, 90.00, NULL, 'Minyak larva BSF – bahan baku biodiesel dan pakan ternak.'),
  ('b2c3d4e5-2222-4000-8000-000000000008', 'a1b2c3d4-1111-4000-8000-000000000004', 'compost', 3000, 300.00, '10-4-7', 'Frass BSF – pupuk organik kaya nitrogen dari sisa proses BSF.'),
  
  -- Dari BogorCompost Sentul
  ('b2c3d4e5-2222-4000-8000-000000000009', 'a1b2c3d4-1111-4000-8000-000000000005', 'compost', 2800, 250.00, '9-4-6', 'Kompos sayur-buah murni. Cocok untuk urban farming.'),
  
  -- Dari Depok Circular Hub
  ('b2c3d4e5-2222-4000-8000-000000000010', 'a1b2c3d4-1111-4000-8000-000000000006', 'compost', 3200, 180.00, '11-5-8', 'Kompos campuran food waste dapur. Sudah disertifikasi SNI.'),
  
  -- Dari BSF Tangerang Selatan
  ('b2c3d4e5-2222-4000-8000-000000000011', 'a1b2c3d4-1111-4000-8000-000000000007', 'bsf', 28000, 35.00, NULL, 'Larva BSF segar – langsung dari farm, untuk pakan lele premium.'),
  ('b2c3d4e5-2222-4000-8000-000000000012', 'a1b2c3d4-1111-4000-8000-000000000007', 'compost', 2000, 400.00, '7-3-5', 'Kasgot ekonomis – pupuk organik untuk lahan pertanian.'),
  
  -- Dari TangerangCompost Bintaro
  ('b2c3d4e5-2222-4000-8000-000000000013', 'a1b2c3d4-1111-4000-8000-000000000008', 'compost', 3800, 90.00, '13-5-9', 'Kompos premium Bintaro – dari sisa restoran dan cafe area BSD.'),
  
  -- Dari Bekasi Maggot Center
  ('b2c3d4e5-2222-4000-8000-000000000014', 'a1b2c3d4-1111-4000-8000-000000000009', 'bsf', 20000, 70.00, NULL, 'Larva BSF kering grade A – standar ekspor pakan ternak.'),
  
  -- Dari EcoFarm Cikarang
  ('b2c3d4e5-2222-4000-8000-000000000015', 'a1b2c3d4-1111-4000-8000-000000000010', 'compost', 3000, 220.00, '10-4-8', 'Kompos industrial – bulk order untuk perkebunan dan nursery.')

ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SEED DATA: Demo Users (for frontend demo – no auth system)
-- ============================================================

INSERT INTO users (id, name, type, business_name, location_lat, location_lng) VALUES
  -- B2B demo user: a restaurant in Jakarta Selatan
  ('d0d0d0d0-0000-4000-8000-000000000001', 'Restoran Hijau Nusantara', 'b2b', 'PT Hijau Nusantara', -6.2615, 106.8106)
ON CONFLICT (id) DO NOTHING;
