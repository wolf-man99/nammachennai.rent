/**
 * Canonical Postgres schema. Idempotent - safe to run repeatedly.
 * `npm run db:push` applies it; it also writes db/schema.sql for the Supabase SQL editor.
 */
export const SCHEMA_SQL = /* sql */ `
create extension if not exists "pgcrypto";

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text unique,
  phone text,
  role text not null default 'renter' check (role in ('renter','owner','admin')),
  created_at timestamptz not null default now()
);

create table if not exists localities (
  id uuid primary key default gen_random_uuid(),
  city text not null default 'chennai',
  name text not null,
  slug text not null,
  latitude double precision not null,
  longitude double precision not null,
  zone text,
  tier int not null default 3,
  created_at timestamptz not null default now(),
  unique (city, slug)
);

create table if not exists rent_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  city text not null default 'chennai',
  locality_id uuid not null references localities(id) on delete cascade,
  latitude double precision,
  longitude double precision,
  bhk text not null,
  property_type text not null,
  rent integer not null check (rent > 0),
  maintenance integer,
  furnishing text not null,
  floor integer,
  parking text,
  society text,
  move_in_date date,
  comments text,
  verification_status text not null default 'pending'
    check (verification_status in ('pending','verified','unverified','rejected')),
  submitter_hash text,
  created_at timestamptz not null default now()
);

create table if not exists listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references users(id) on delete set null,
  city text not null default 'chennai',
  locality_id uuid not null references localities(id) on delete cascade,
  latitude double precision,
  longitude double precision,
  bhk text not null,
  property_type text not null,
  rent integer not null check (rent > 0),
  maintenance integer,
  deposit integer,
  furnishing text not null,
  parking text,
  area_sqft integer,
  available_from date,
  title text,
  description text,
  status text not null default 'active' check (status in ('active','rented','expired','hidden')),
  verification_status text not null default 'pending'
    check (verification_status in ('pending','verified','unverified','rejected')),
  owner_name text,
  owner_phone text,
  owner_email text,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create table if not exists listing_photos (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  url text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists seekers (
  id uuid primary key default gen_random_uuid(),
  city text not null default 'chennai',
  locality_id uuid not null references localities(id) on delete cascade,
  latitude double precision,
  longitude double precision,
  radius_km double precision not null default 5,
  min_rent integer,
  max_rent integer not null,
  bhk text not null,
  furnishing text,
  property_type text,
  move_in_date date,
  room_or_full text not null default 'full',
  contact_name text,
  contact_phone text,
  contact_email text,
  created_at timestamptz not null default now()
);

create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  seeker_id uuid not null references seekers(id) on delete cascade,
  listing_id uuid not null references listings(id) on delete cascade,
  match_score double precision not null,
  distance_km double precision not null,
  created_at timestamptz not null default now(),
  contacted_at timestamptz,
  unique (seeker_id, listing_id)
);

create table if not exists flatmate_listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  city text not null default 'chennai',
  locality_id uuid not null references localities(id) on delete cascade,
  latitude double precision,
  longitude double precision,
  rent integer not null check (rent > 0),
  room_type text not null,
  total_bhk text not null,
  gender_preference text not null default 'any',
  furnishing text not null,
  move_in_date date,
  description text,
  status text not null default 'active',
  verification_status text not null default 'pending',
  contact_name text,
  contact_phone text,
  contact_email text,
  created_at timestamptz not null default now()
);

create table if not exists tolet_reports (
  id uuid primary key default gen_random_uuid(),
  city text not null default 'chennai',
  locality_id uuid not null references localities(id) on delete cascade,
  latitude double precision,
  longitude double precision,
  photo text,
  rent integer,
  bhk text,
  phone text,
  landmark text,
  seen_at date not null default current_date,
  status text not null default 'active' check (status in ('active','rented','stale','invalid')),
  created_at timestamptz not null default now()
);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  reason text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  props jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Indexes tuned for the two hot paths: locality intelligence and map bounds.
create index if not exists idx_rent_sub_locality on rent_submissions (locality_id, bhk, verification_status);
create index if not exists idx_rent_sub_created on rent_submissions (created_at desc);
create index if not exists idx_rent_sub_geo on rent_submissions (latitude, longitude);
create index if not exists idx_listings_locality on listings (locality_id, status, bhk);
create index if not exists idx_listings_created on listings (created_at desc);
create index if not exists idx_listings_geo on listings (latitude, longitude);
create index if not exists idx_tolet_locality on tolet_reports (locality_id, status);
create index if not exists idx_flatmates_locality on flatmate_listings (locality_id, status);
create index if not exists idx_matches_seeker on matches (seeker_id, match_score desc);
create index if not exists idx_photos_listing on listing_photos (listing_id, position);

-- ---------------------------------------------------------------------------
-- Row level security.
--
-- The app server connects with a privileged role and does its own authorisation,
-- but anon/authenticated keys must never be able to read contact columns. The
-- views below are the only public read surface; base tables stay locked.
-- ---------------------------------------------------------------------------

alter table users enable row level security;
alter table rent_submissions enable row level security;
alter table listings enable row level security;
alter table listing_photos enable row level security;
alter table seekers enable row level security;
alter table matches enable row level security;
alter table flatmate_listings enable row level security;
alter table tolet_reports enable row level security;
alter table reports enable row level security;
alter table localities enable row level security;
alter table events enable row level security;

drop policy if exists localities_public_read on localities;
create policy localities_public_read on localities for select using (true);

create or replace view public_listings as
  select id, city, locality_id, latitude, longitude, bhk, property_type, rent, maintenance,
         deposit, furnishing, parking, area_sqft, available_from, title, description,
         status, verification_status, created_at, expires_at
  from listings
  where status = 'active' and verification_status in ('pending','verified');

create or replace view public_rent_submissions as
  select id, city, locality_id, latitude, longitude, bhk, property_type, rent, maintenance,
         furnishing, floor, parking, move_in_date, comments, created_at
  from rent_submissions
  where verification_status in ('pending','verified');

create or replace view public_tolet_reports as
  select id, city, locality_id, latitude, longitude, photo, rent, bhk, landmark, seen_at,
         status, created_at, (phone is not null) as has_phone
  from tolet_reports
  where status = 'active';

create or replace view public_flatmate_listings as
  select id, city, locality_id, latitude, longitude, rent, room_type, total_bhk,
         gender_preference, furnishing, move_in_date, description, status, created_at
  from flatmate_listings
  where status = 'active' and verification_status in ('pending','verified');
`;
