-- PropScout — Week 1–2 data pipeline tables
-- Migration: 20260524_create_listings_tables.sql
--
-- Creates:
--   listings         — for-sale and for-rent listings from Realtor.ca / Zillow.ca
--   rental_listings  — rental comps scraped from Rentals.ca, Kijiji, PadMapper
--   scrape_logs      — audit trail for responsible scraping

-- ── listings ──────────────────────────────────────────────────────────────────
-- One row per unique listing URL. Re-scraping upserts on source_url.

create table if not exists listings (
  id                  uuid primary key default gen_random_uuid(),
  source_url          text unique not null,
  source              text not null,              -- 'realtor_ca' | 'zillow_ca'
  listing_type        text not null,              -- 'for_sale' | 'for_rent' | 'unknown'
  address             text,
  postal_code         text,
  province            text,
  price               numeric,
  beds                integer,
  baths               numeric,
  sqft                integer,
  property_type       text,
  annual_taxes        numeric,
  taxes_known         boolean default false,
  condo_fee           numeric,
  condo_fee_known     boolean default false,
  year_built          integer,
  year_built_known    boolean default false,
  days_on_market      integer,
  listing_description text,
  photo_urls          jsonb,                      -- array of URL strings — stored as metadata only
  raw_json            jsonb,                      -- full raw API response for debugging
  scrape_status       text,                       -- 'success' | 'partial' | 'failed'
  missing_fields      jsonb,                      -- array of field names that defaulted to null
  scraped_at          timestamptz default now(),
  created_at          timestamptz default now()
);

-- Index for common query patterns
create index if not exists idx_listings_postal_code     on listings (postal_code);
create index if not exists idx_listings_province        on listings (province);
create index if not exists idx_listings_listing_type    on listings (listing_type);
create index if not exists idx_listings_beds            on listings (beds);
create index if not exists idx_listings_scraped_at      on listings (scraped_at desc);

-- ── rental_listings ───────────────────────────────────────────────────────────
-- Nightly comps data. Deduplicated by address+rent+beds hash.

create table if not exists rental_listings (
  id              uuid primary key default gen_random_uuid(),
  source          text not null,             -- 'rentals_ca' | 'kijiji' | 'padmapper'
  address         text,
  postal_code     text,
  lat             numeric,
  lng             numeric,
  beds            integer,
  baths           numeric,
  rent_monthly    numeric not null,
  sqft            integer,
  listed_at       date,
  scraped_at      timestamptz default now(),
  dedup_hash      text unique,               -- md5(address + rent_monthly + beds) — prevents duplicate scrapes
  raw_json        jsonb
);

-- Indexes for the comps radius query (lat/lng bounding box + beds filter)
create index if not exists idx_rental_listings_lat_lng   on rental_listings (lat, lng);
create index if not exists idx_rental_listings_beds       on rental_listings (beds);
create index if not exists idx_rental_listings_scraped_at on rental_listings (scraped_at desc);
create index if not exists idx_rental_listings_dedup_hash on rental_listings (dedup_hash);

-- ── scrape_logs ───────────────────────────────────────────────────────────────
-- Audit trail for every HTTP request made by the scrapers.
-- Required for responsible-use documentation.

create table if not exists scrape_logs (
  id           uuid primary key default gen_random_uuid(),
  ts           timestamptz default now(),
  source       text not null,              -- 'realtor_ca' | 'zillow_ca' | 'rentals_ca' | etc.
  url          text not null,
  status       text not null,             -- 'success' | 'partial' | 'failed'
  http_status  integer,                   -- HTTP response code (null if request never completed)
  error_msg    text,                      -- raw error message, internal only
  duration_ms  integer                    -- request duration in milliseconds
);

create index if not exists idx_scrape_logs_ts     on scrape_logs (ts desc);
create index if not exists idx_scrape_logs_source on scrape_logs (source);
