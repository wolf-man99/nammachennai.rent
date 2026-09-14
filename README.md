# Chennai.rent

**Know what rent should cost.**

Chennai-first rental intelligence and owner-direct housing. Renters report what
they actually pay, the platform turns that into locality-level medians, trends
and comparisons, and owners list homes directly with no brokerage.

---

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
```

No configuration is required. With no `DATABASE_URL` set the app uses a local
JSON file store under `.data/`, so a fresh clone runs immediately. Chennai
locality reference data seeds itself on first read.

```bash
npm run seed         # ensure localities exist + import data/seed/*.json
npm run typecheck
npm run lint
npm run build && npm start
```

## Going to production

1. Create a Postgres database (Supabase works well) and set `DATABASE_URL`.
2. `npm run db:push` — applies the schema and writes `db/schema.sql` for anyone
   who prefers the Supabase SQL editor.
3. Set `ADMIN_PASSWORD` to enable `/admin`, and `HASH_SALT` to a long random
   string.
4. For photo uploads set `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`. A
   serverless filesystem is read-only, so the `public/uploads` fallback is for
   local development only.
5. Deploy to Vercel. Nothing else is required — the map needs no token.

See `.env.example` for every variable.

---

## The product

Six loops, all live:

| Loop | Route | What it does |
| --- | --- | --- |
| Rent data | `/submit-rent` | Anonymous rent report, no account |
| Rent search | `/`, `/explore` | Parses "2 BHK OMR under 30k" and routes to the right report |
| Rent map | `/map` | Reports, owner listings and To-Let boards, each with its own accent |
| Owner-direct | `/list-property`, `/listings`, `/property/[id]` | Zero-brokerage marketplace |
| Seeker | `/find` | Stores a requirement and returns ranked matches immediately |
| To-Let | `/to-let` | Turns physical boards into searchable inventory |
| Flatmates | `/flatmates` | Rooms and shared flats |

Locality intelligence lives at `/chennai/[locality]` and `/chennai/[locality]/[bhk]`.
Corridors get their own page too — `/chennai/omr` aggregates every locality on it.

---

## Rules the code enforces

**Never invent a number.** A median is published only once a locality-and-size
pool reaches `MIN_SAMPLE` (5) reports. Below that, every surface says "not
enough renter data yet". Trend needs two comparable 90-day windows. A BHK page
is only marked indexable, and only enters the sitemap, at
`MIN_SAMPLE_INDEXABLE` (8) reports — see `lib/constants.ts`.

**Contact details are never public.** Owner and flatmate phone numbers, and the
number on a To-Let board, are stripped from every listing payload
(`toPublicListing` and friends) and released only through
`POST /api/<entity>/[id]/contact`, which requires the renter to identify
themselves and is rate limited per address.

**Rent reports are anonymous.** No name, email or phone is collected. Society
names are stored but never published, and every published coordinate is blurred
by ~400 m (`lib/geo.ts`).

---

## Secrets

Nothing secret is ever committed. `.gitignore` excludes every `.env` variant
except the template, and `npm run scan:secrets` fails the build if a credential
shape reaches a tracked file, git history, or the client bundle — run it in CI.

Where each value lives:

| Value | Storage | Why |
| --- | --- | --- |
| `DATABASE_URL`, `SUPABASE_SECRET_KEY` | Platform secret store (Vercel env vars) | The server must present the original value to authenticate, so these are encrypted at rest, never hashed |
| `ADMIN_PASSWORD_HASH` | Platform secret store | Only ever compared, so it **is** hashed — scrypt, 16-byte salt, via `npm run admin:hash` |
| `HASH_SALT` | Platform secret store | Salts the non-reversible submitter fingerprint |
| `NEXT_PUBLIC_*` | Public by design | Inlined into the browser bundle — never put a secret here |

Only `NEXT_PUBLIC_`-prefixed variables reach the client. Everything else is read
from `process.env` at runtime and is absent from the build output, which
`scan:secrets` verifies against `.next/static` on every run.

Anyone with access to the hosting project or the Supabase dashboard can read the
runtime secrets — that is inherent to the server needing them. Limit who holds
those logins, and rotate in Supabase (Settings → API → roll key; Settings →
Database → reset password) if a value is ever exposed.

---

## Architecture

```
app/                 routes (App Router) + API handlers
components/
  ui/ charts/ forms/ navigation/ listings/ map/ rent-data/
lib/
  db/                store interface + Postgres and file drivers
  validation/        zod schemas shared by the API and the importer
  analytics/ geo.ts format.ts quality.ts rate-limit.ts admin-auth.ts
services/            rent-stats, listings, matching, map, tolet, flatmates, admin
data/localities.ts   Chennai reference data — add a locality in one line
db/schema.sql        generated Postgres schema (edit lib/db/schema-sql.ts)
```

**Data layer.** Everything goes through a small `Store` interface
(`lib/db/store.ts`) with two drivers. Filters are typed conditions and every
field name is checked against `lib/db/schema.ts`, so a filter built from user
input can never become an identifier injection.

**Matching** (`services/matching.ts`) is deterministic — a weighted score over
distance, budget fit, size fit, preference fit and freshness, with explainable
reasons. No model, so a renter can always be told why a home surfaced.

**City scoping.** Every table carries `city`, and localities are data rather
than code. Adding Hyderabad means adding rows, not branching the app. Chennai is
the only active city.

---

## Seeding

`npm run seed` never generates rental data. It ensures localities exist and
imports structured records from `data/seed/*.json`, validating each one with the
same schema the public API uses. See `data/seed/README.md`.

---

## Design

Typography is Outfit — the closest open geometric sans to Lufga, wired through
`--font-display` so swapping in a licensed Lufga is a one-line change. Colour is
a token system in `app/globals.css`: near-black ink on an off-white ground, with
three accents that carry meaning rather than decoration — purple for renter
data, lime for owner-direct supply, blue for To-Let. Charts are hand-built SVG
and CSS, so locality pages paint their data on the server with no charting
library.
