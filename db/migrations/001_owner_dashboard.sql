-- Owner dashboard tables. Run once in the Supabase SQL editor.
-- Safe to re-run: every statement is idempotent.

-- ---------------------------------------------------------------------------
-- Owner dashboard
--
-- Keyed by phone number rather than by account: the listing already carries the
-- owner's number, so a secret link is enough to prove they hold it. Adding OTP
-- later becomes a second door into the same dashboard, not a rebuild.
-- ---------------------------------------------------------------------------

create table if not exists owner_access (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  -- Only the hash is stored, so a database leak yields no working links.
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);

create table if not exists listing_enquiries (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  name text not null,
  phone text not null,
  created_at timestamptz not null default now()
);

create table if not exists listing_views (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  -- One row per viewer per day, so "unique viewers" means something.
  viewer_hash text not null,
  created_at timestamptz not null default now(),
  unique (listing_id, viewer_hash)
);

create index if not exists idx_enquiries_listing on listing_enquiries (listing_id, created_at desc);
create index if not exists idx_views_listing on listing_views (listing_id);
create index if not exists idx_owner_access_token on owner_access (token_hash);
create index if not exists idx_listings_owner_phone on listings (owner_phone);

alter table owner_access enable row level security;
alter table listing_enquiries enable row level security;
alter table listing_views enable row level security;
