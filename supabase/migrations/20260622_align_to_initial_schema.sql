-- Align an existing dev DB (HEAD WIP schema) with 20260610_initial_schema.sql.
--
-- Background:
--   feat/route-wiring shipped two early migrations (20260531_add_analyses_table,
--   20260531_add_listings_table) that created `analyses` and `listings` with a
--   different shape (single `analysis` jsonb blob, `token` uuid, `status` text)
--   than origin/claude/codebase-status-next-b2uufc's comprehensive schema in
--   20260610_initial_schema.sql.
--
--   The merged supabaseService.ts is written against origin's schema (split
--   columns, `share_token` text, no `status` column — status is computed from
--   `calculated_metrics is null`). Running against the HEAD-shaped tables errors
--   on every query.
--
-- This migration drops the three mismatched tables so 20260610_initial_schema.sql
-- can be re-applied cleanly. `scrape_logs` (191 rows of operational data, not
-- in any migration file) is preserved.
--
-- Run order:
--   1. This file       — drops the mismatched tables
--   2. 20260610_initial_schema.sql — recreates them in the correct shape, plus
--                                    adds users, subscriptions, schools,
--                                    waitlist, portfolio_properties,
--                                    flag_overrides, sanity_failures
--
-- The 14 dev rows in `analyses` and `listings` are discarded — confirmed dev
-- data with the user before running. `rental_listings` was empty so the drop
-- is a no-op for data.

drop table if exists public.analyses cascade;
drop table if exists public.listings cascade;
drop table if exists public.rental_listings cascade;
