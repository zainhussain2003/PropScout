-- Adds rent_monthly, city, and parking_spots to the listings table.
--
-- The initial schema (20260610) tracked these implicitly:
--   - rent_monthly: for-rent listings stuffed the asking rent into `price`,
--     which broke when the calc engine treated price as the purchase price.
--   - city: derived at read time from the comma-separated address — brittle
--     and lost in lookups (e.g. cmhcService.getVacancyRateByCity).
--   - parking_spots: dropped entirely on save.
--
-- This migration adds them as nullable columns so existing rows aren't
-- affected. The supabaseService listingToRow / rowToListing are updated in
-- the same change to read and write the new fields.

alter table public.listings
  add column if not exists rent_monthly numeric,
  add column if not exists city text,
  add column if not exists parking_spots integer;

-- Backfill rent_monthly for existing for-rent rows where someone stuffed
-- the rent into `price`. New rows from the updated scraper write rent to
-- rent_monthly directly and leave price null.
update public.listings
  set rent_monthly = price
  where listing_type = 'for_rent'
    and rent_monthly is null
    and price is not null;
