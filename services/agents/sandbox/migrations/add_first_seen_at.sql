-- =============================================================================
-- Migration: add first_seen_at to rental_comps
-- =============================================================================
-- Purpose  : Records the timestamp at which a rental comp was first ingested.
-- Type     : Additive, nullable column — no backfill, no NOT NULL constraint,
--            no default value.  Zero-downtime; safe to run on a live table.
-- Reversible: Yes — simply DROP COLUMN first_seen_at if a rollback is needed.
-- IF NOT EXISTS guard makes this idempotent (safe to re-run).
-- =============================================================================
-- HOW TO APPLY:
--   1. Open the Supabase dashboard → SQL Editor (or your preferred psql client).
--   2. Paste and run this file against the PROD database.
--   3. Verify with:  SELECT column_name, data_type, is_nullable
--                    FROM information_schema.columns
--                    WHERE table_name = 'rental_comps'
--                      AND column_name = 'first_seen_at';
--   4. Expected result: one row — timestamptz / YES (nullable).
-- =============================================================================

ALTER TABLE rental_comps
  ADD COLUMN IF NOT EXISTS first_seen_at timestamptz;
