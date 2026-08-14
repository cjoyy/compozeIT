-- Reset only the B2B demo user's submission history, then seed one row per waste type.
-- Run this file in Supabase SQL Editor when preparing a clean live demo.
-- It does not touch other users, processors, marketplace listings, or transactions.

BEGIN;

DO $$
DECLARE
  demo_user_id UUID := 'd0d0d0d0-0000-4000-8000-000000000001';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = demo_user_id AND type = 'b2b') THEN
    RAISE EXCEPTION 'Demo B2B user % was not found', demo_user_id;
  END IF;
END $$;

CREATE TEMP TABLE reset_demo_submission_ids ON COMMIT DROP AS
SELECT id
FROM waste_submissions
WHERE user_id = 'd0d0d0d0-0000-4000-8000-000000000001';

CREATE TEMP TABLE reset_demo_batch_ids ON COMMIT DROP AS
SELECT DISTINCT batch_id
FROM batch_submissions
WHERE submission_id IN (SELECT id FROM reset_demo_submission_ids)
  AND NOT EXISTS (
    SELECT 1
    FROM batch_submissions other_submissions
    WHERE other_submissions.batch_id = batch_submissions.batch_id
      AND other_submissions.submission_id NOT IN (SELECT id FROM reset_demo_submission_ids)
  );

-- Remove timeline only for batches that contain demo submissions exclusively.
DELETE FROM batch_status_events
WHERE batch_id IN (SELECT batch_id FROM reset_demo_batch_ids);

DELETE FROM batch_submissions
WHERE submission_id IN (SELECT id FROM reset_demo_submission_ids);

DELETE FROM waste_submissions
WHERE id IN (SELECT id FROM reset_demo_submission_ids);

-- A batch is removed only when it no longer contains another user's submission.
DELETE FROM batches
WHERE id IN (SELECT batch_id FROM reset_demo_batch_ids)
  AND NOT EXISTS (
    SELECT 1 FROM batch_submissions
    WHERE batch_submissions.batch_id = batches.id
  );

UPDATE users
SET total_cashback_balance = 0,
    subscription_status = 'active'
WHERE id = 'd0d0d0d0-0000-4000-8000-000000000001';

-- One clean example for every supported food-waste category.
-- Cashback assumption: estimated_weight_kg × Rp1.000/kg.
INSERT INTO waste_submissions (
  id,
  user_id,
  waste_type,
  estimated_weight_kg,
  cashback_amount,
  is_contaminated,
  contaminant_type,
  confidence,
  track,
  status,
  created_at
)
VALUES
  ('e1000000-0000-4000-8000-000000000001', 'd0d0d0d0-0000-4000-8000-000000000001', 'nasi',     3.20,  3200, false, NULL,      0.94, 'b2b', 'pending', now() - interval '5 hours'),
  ('e1000000-0000-4000-8000-000000000002', 'd0d0d0d0-0000-4000-8000-000000000001', 'sayur',    4.80,  4800, true,  'plastik', 0.91, 'b2b', 'pending', now() - interval '4 hours'),
  ('e1000000-0000-4000-8000-000000000003', 'd0d0d0d0-0000-4000-8000-000000000001', 'protein',  2.40,  2400, false, NULL,      0.89, 'b2b', 'pending', now() - interval '3 hours'),
  ('e1000000-0000-4000-8000-000000000004', 'd0d0d0d0-0000-4000-8000-000000000001', 'buah',     3.60,  3600, false, NULL,      0.93, 'b2b', 'pending', now() - interval '2 hours'),
  ('e1000000-0000-4000-8000-000000000005', 'd0d0d0d0-0000-4000-8000-000000000001', 'campuran', 5.10,  5100, true,  'lainnya', 0.86, 'b2b', 'pending', now() - interval '1 hour'),
  ('e1000000-0000-4000-8000-000000000006', 'd0d0d0d0-0000-4000-8000-000000000001', 'lainnya',  1.70,  1700, false, NULL,      0.82, 'b2b', 'pending', now());

UPDATE users
SET total_cashback_balance = (
  SELECT COALESCE(SUM(cashback_amount), 0)
  FROM waste_submissions
  WHERE user_id = 'd0d0d0d0-0000-4000-8000-000000000001'
);

COMMIT;

-- Expected result: 6 submissions and Rp20.800 cashback balance.
