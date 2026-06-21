create table if not exists analyses (
  id          uuid primary key default gen_random_uuid(),
  token       uuid unique not null default gen_random_uuid(),
  listing_id  uuid references listings(id) on delete cascade,
  user_id     uuid,                          -- nullable: guest analyses allowed
  mode        text,                          -- 'investor' | 'personal' | 'tenant' | 'landlord'
  status      text not null default 'pending', -- 'pending' | 'processing' | 'complete' | 'failed'
  analysis    jsonb,                         -- null until status = 'complete'
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default (now() + interval '30 days')
);

create index if not exists analyses_token_idx on analyses(token);
create index if not exists analyses_listing_id_idx on analyses(listing_id);
