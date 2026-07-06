-- Add a uniqueness invariant on rental_listings.source_url.
--
-- Purpose: let the nightly scraper UPSERT (ON CONFLICT (source_url) DO UPDATE)
-- so a re-scraped listing backfills its existing row in place — beds, postal
-- code, rent, scraped_at — instead of appending a duplicate. Makes "don't
-- duplicate a listing" a TABLE INVARIANT enforced by the database, not a thing
-- the scraper has to remember, so every cron run (laptop or Railway) is
-- upsert-safe by construction.
--
-- Implemented as a UNIQUE INDEX rather than ALTER TABLE ... ADD CONSTRAINT:
--   1. Idempotency — `create unique index if not exists` is safe to re-run; a
--      bare ADD CONSTRAINT errors if it already exists. (Matches this repo's
--      "migrations should be re-runnable" expectation.)
--   2. ON CONFLICT (source_url) works identically against a unique index — in
--      Postgres a unique constraint IS a unique index under the hood.
--
-- Pre-flight check (2026-06-23, read-only): 92 rows, 0 duplicate source_url,
-- 0 NULL, 0 bare base-URL rows — so this applies cleanly with no dedup step.
-- At current scale (<100 rows) the index builds instantly; no CONCURRENTLY needed.
--
-- NOTE: source_url is nullable and Postgres treats NULLs as distinct, so NULL
-- rows neither collide nor upsert. The source modules always set source_url
-- (worst case a bare base URL), so this is not expected to matter — but a future
-- run that produces NULL or repeated base-URL fallbacks would not dedupe on those.

create unique index if not exists rental_listings_source_url_key
  on public.rental_listings (source_url);
