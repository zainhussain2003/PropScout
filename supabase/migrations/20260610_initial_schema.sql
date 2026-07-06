-- PropScout initial schema — spec Section 11.5 (TEMPLATE CODE evolved)
-- Tables: users, subscriptions, listings, rental_listings, schools, analyses,
--         portfolio_properties, waitlist, flag_overrides, sanity_failures
--
-- All backend access goes through the Fastify API using the service role key
-- (bypasses RLS). RLS is enabled on every table so the anon key exposes nothing;
-- owner policies exist only where a logged-in user reads their own rows.

-- ── users ─────────────────────────────────────────────────────────────────────
-- Mirrors auth.users — one row per account, created on signup.
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  tier text not null default 'free'
    check (tier in ('free', 'pro', 'professional', 'team')),
  stripe_customer_id text,
  created_at timestamptz not null default now()
);

-- ── subscriptions ─────────────────────────────────────────────────────────────
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  tier text not null check (tier in ('pro', 'professional', 'team')),
  status text not null,                       -- Stripe status: active, past_due, canceled...
  current_period_end timestamptz,
  stripe_subscription_id text unique,
  created_at timestamptz not null default now()
);

create index subscriptions_user_id_idx on public.subscriptions (user_id);

-- ── listings ──────────────────────────────────────────────────────────────────
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  source_url text unique not null,
  source text not null check (source in ('realtor_ca', 'zillow_ca', 'manual')),
  listing_type text not null check (listing_type in ('for_sale', 'for_rent')),
  address text not null,
  postal_code char(6),
  province char(2),
  price integer,
  beds integer,
  baths numeric,
  sqft integer,
  property_type text,
  annual_taxes integer,
  taxes_known boolean not null default false,
  condo_fee_monthly integer,
  condo_fee_known boolean not null default false,
  year_built integer,
  year_built_known boolean not null default false,
  listing_description text,
  photo_urls jsonb,
  days_on_market integer,
  scraped_at timestamptz not null default now()
);

create index listings_postal_code_idx on public.listings (postal_code);

-- ── rental_listings ───────────────────────────────────────────────────────────
-- Populated by the nightly rental comps scraper. Historical rows are never
-- deleted — accumulation is the moat (spec Section 11.2).
create table public.rental_listings (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('rentals_ca', 'kijiji', 'padmapper')),
  source_url text,
  address text not null,
  postal_code char(6),
  lat numeric,
  lng numeric,
  beds integer,
  baths numeric,
  rent_monthly integer not null,
  sqft integer,
  listed_at date,
  scraped_at timestamptz not null default now(),
  is_active boolean not null default true,
  raw_json jsonb
);

-- Comp query path: FSA prefix + beds + recency (spec Section 11.2 comp selection)
create index rental_listings_comp_query_idx
  on public.rental_listings (postal_code, beds, scraped_at desc);
-- Dedupe lookup: same address + rent + beds within 7 days = one record
create index rental_listings_dedupe_idx
  on public.rental_listings (address, rent_monthly, beds, scraped_at desc);

-- ── schools ───────────────────────────────────────────────────────────────────
create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  school_type text not null check (school_type in ('elementary', 'middle', 'high')),
  address text,
  postal_code char(6),
  lat numeric,
  lng numeric,
  eqao_score numeric,
  fraser_rank_pct integer,
  graduation_rate numeric,
  board text,
  data_year integer,
  updated_at timestamptz not null default now()
);

create index schools_postal_code_idx on public.schools (postal_code);

-- ── analyses ──────────────────────────────────────────────────────────────────
create table public.analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users (id) on delete set null,  -- null = guest
  listing_id uuid references public.listings (id) on delete set null,
  report_mode text not null
    check (report_mode in ('investment', 'personal', 'tenant', 'landlord')),
  financing_params jsonb,
  rental_estimate jsonb,
  market_data jsonb,
  calculated_metrics jsonb,
  deal_score integer check (deal_score between 0 and 100),
  risk_flags jsonb,
  ai_narrative text,
  pdf_url text,
  share_token text unique,
  share_expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index analyses_user_id_idx on public.analyses (user_id);
create index analyses_share_token_idx on public.analyses (share_token);

-- ── portfolio_properties ──────────────────────────────────────────────────────
create table public.portfolio_properties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  address text not null,
  purchase_price integer,
  purchase_date date,
  original_analysis_id uuid references public.analyses (id) on delete set null,
  current_mortgage_balance integer,
  current_rate numeric,
  current_rent_monthly integer,
  lease_end_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index portfolio_properties_user_id_idx on public.portfolio_properties (user_id);

-- ── waitlist ──────────────────────────────────────────────────────────────────
create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  province char(2) not null,
  created_at timestamptz not null default now()
);

create unique index waitlist_email_province_idx on public.waitlist (email, province);

-- ── flag_overrides ────────────────────────────────────────────────────────────
-- "This is wrong" toggle on risk flags (spec Section 19, TESTING.md Test 33).
create table public.flag_overrides (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses (id) on delete cascade,
  flag_id text not null,
  user_override boolean not null default true,
  created_at timestamptz not null default now()
);

create index flag_overrides_analysis_id_idx on public.flag_overrides (analysis_id);

-- ── sanity_failures ───────────────────────────────────────────────────────────
-- Written by supabaseService.logSanityFailure() — calc engine outputs that
-- failed bounds checks, logged for review (CLAUDE.md Section 12).
create table public.sanity_failures (
  id uuid primary key default gen_random_uuid(),
  address text not null,
  failures jsonb not null,
  logged_at timestamptz not null default now()
);

-- ── Row Level Security ────────────────────────────────────────────────────────
-- Enabled everywhere. The service role key (backend only) bypasses RLS.
-- Owner policies below are the only anon/auth key access that exists.

alter table public.users enable row level security;
alter table public.subscriptions enable row level security;
alter table public.listings enable row level security;
alter table public.rental_listings enable row level security;
alter table public.schools enable row level security;
alter table public.analyses enable row level security;
alter table public.portfolio_properties enable row level security;
alter table public.waitlist enable row level security;
alter table public.flag_overrides enable row level security;
alter table public.sanity_failures enable row level security;

create policy "users read own row"
  on public.users for select
  using (auth.uid() = id);

create policy "users read own subscriptions"
  on public.subscriptions for select
  using (auth.uid() = user_id);

create policy "users read own analyses"
  on public.analyses for select
  using (auth.uid() = user_id);

create policy "users manage own portfolio"
  on public.portfolio_properties for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
