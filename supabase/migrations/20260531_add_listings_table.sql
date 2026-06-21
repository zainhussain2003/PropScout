create table if not exists listings (
  id                  uuid primary key default gen_random_uuid(),
  url                 text not null,
  listing_type        text not null,          -- 'for-sale' | 'for-rent'
  address             text not null,
  city                text not null default '',
  province            text not null default 'ON',
  postal_code         text not null default '',
  price               numeric,               -- null for for-rent listings
  rent_monthly        numeric,               -- null for for-sale listings
  beds                integer not null default 0,
  baths               numeric not null default 0,
  sqft                integer,
  property_type       text not null default 'condo',
  year_built          integer,
  parking_spots       integer not null default 0,
  condo_fee_monthly   numeric,
  condo_fee_known     boolean not null default false,
  annual_taxes        numeric,
  description         text,
  photos              text[] not null default '{}',
  scraped_at          timestamptz not null default now(),
  created_at          timestamptz not null default now()
);

create index if not exists listings_url_idx on listings(url);
create index if not exists listings_postal_code_idx on listings(postal_code);
