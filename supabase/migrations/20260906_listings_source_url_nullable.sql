-- Allow listings.source_url to be NULL.
--
-- Why
-- ---
-- `listings.source_url` was declared `text unique not null` on the assumption
-- that every listing comes from a page we scraped. Address-entered listings
-- (POST /address/start) have no source URL: a person typed the address, there
-- is no page behind it.
--
-- Because the column is NOT NULL, those listings were all written with the
-- empty string, and the UNIQUE constraint made every one of them collide on
-- that single row. `saveListing` upserted on source_url, so the collision was
-- silent: each new address OVERWROTE the previous listing, and share tokens
-- issued earlier repointed at whatever property was entered most recently.
-- Two people analysing two addresses would see each other's property.
--
-- Postgres treats NULLs as distinct for uniqueness, so making the column
-- nullable lets every address-entered listing keep its own row while scraped
-- listings continue to deduplicate on their URL exactly as before.
--
-- Safety
-- ------
-- This only relaxes a constraint. No rows are rewritten, nothing is dropped,
-- and existing scraped rows are untouched. It is safe to run against a live
-- database and safe to run more than once.
--
-- The pre-existing rows that carry '' (written before this fix) are migrated to
-- NULL so they stop competing for the single empty-string slot. There is at
-- most a handful of them and '' was never a meaningful value.

alter table public.listings
  alter column source_url drop not null;

update public.listings
  set source_url = null
  where source_url = '';
