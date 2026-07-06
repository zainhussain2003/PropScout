-- Unique index required by scripts/load-schools.mjs, which upserts with
-- onConflict: 'name,postal_code'. Without a matching unique constraint the
-- FIRST real data load fails with "no unique or exclusion constraint matching
-- the ON CONFLICT specification" — caught in the 2026-07-01 load-path audit,
-- before any data existed.
--
-- Caveat (documented, accepted): Postgres treats NULLs as distinct in unique
-- indexes, so rows with a NULL postal_code never conflict — a re-run of the
-- loader would duplicate schools that lack a postal code. The loader should be
-- fed rows with postal codes; nulls are tolerated but not dedupe-protected.
--
-- NOT YET APPLIED to production Supabase — run via the dashboard SQL editor or
-- supabase db push before the first `node scripts/load-schools.mjs` run.

create unique index if not exists schools_name_postal_code_unique_idx
  on public.schools (name, postal_code);
