-- Add first_seen_at to rental_listings — enables days-on-market and a query-time
-- freshness filter that ages stale "ghost" rows out of the comp set.
--
-- THE PAIRING (and why there is no separate last_seen_at column):
--   scraped_at is ALREADY the last-seen timestamp — the source_url upsert stamps
--   it = now() on every re-scrape (see supabase_service.insert_rental_listings).
--   So we only need to add the OTHER end of the interval: first_seen_at, the
--   created / first-insertion time. The upsert OMITS first_seen_at from its
--   payload, so its `default now()` fires once on INSERT and ON CONFLICT DO UPDATE
--   never touches it — true created-time, preserved across every re-scrape.
--
--   Adding a separate last_seen_at would write the same now() to two columns and
--   duplicate the recency index for no gain. (If explicit naming is ever preferred,
--   the clean path is to RENAME scraped_at -> last_seen_at — a heavier rewrite of
--   every reader — not to carry both.)
--
--   Result:
--     days-on-market   = scraped_at (last-seen) - first_seen_at (created)
--     freshness filter  = scraped_at >= now() - <window>
--   The existing rental_listings_comp_query_idx (postal_code, beds, scraped_at desc)
--   already serves that filter — NO new index needed.
--
-- HONESTY NOTE on the backfill: first_seen_at is seeded from scraped_at, but last
-- night's backfill run overwrote scraped_at = run-time on the 27 toronto-p1 rows
-- whose URL recurred. For those 27, the seeded first_seen_at is therefore
-- BEST-AVAILABLE, not true first-insertion (it is last-night's run time). Acceptable
-- — toronto-p1 is seed data and real history begins when the cron goes live — but it
-- is NOT a true first-seen for those rows.
--
-- Idempotent / re-runnable: add-column IF NOT EXISTS, and the backfill uses LEAST()
-- so re-running only ever moves first_seen_at earlier, never clobbers a true earlier
-- value (a no-op on already-seeded rows, and it skips post-migration rows whose
-- first_seen_at is already earlier than their refreshed scraped_at).
--
-- ATOMIC (important): `add column ... default now()` first stamps EVERY existing row
-- with first_seen_at = apply-time, and the UPDATE then corrects them to scraped_at.
-- These MUST run in one transaction — if the UPDATE is skipped/fails, all rows are
-- left at apply-time (every listing looks brand-new, days-on-market = 0 forever).
-- The BEGIN/COMMIT below guarantees that when pasted into the Supabase SQL Editor.

begin;

alter table public.rental_listings
  add column if not exists first_seen_at timestamptz not null default now();

update public.rental_listings
  set first_seen_at = least(first_seen_at, scraped_at);

-- Document the now-misleading name: scraped_at is LAST-seen (refreshed every upsert),
-- not first-scraped. first_seen_at is created-time. days-on-market = difference.
comment on column public.rental_listings.scraped_at is
  'Last-seen timestamp — refreshed to now() on every source_url upsert (NOT first scrape).';
comment on column public.rental_listings.first_seen_at is
  'Created / first-insertion timestamp — set once on insert, never updated by the upsert.';

commit;
