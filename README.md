# Rent In Chennai

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

There are two ways to reach Supabase. Pick one.

**A — REST, no connection string.** The app talks to Supabase over HTTPS with
the project's secret key. No database password exists anywhere in the
deployment, and serverless functions need no connection pool.

1. Paste `db/schema.sql` into the Supabase SQL editor and run it.
2. Set `SUPABASE_URL` and `SUPABASE_SECRET_KEY`.

**B — direct Postgres.** Lower per-query latency, and migrations run from the CLI.

1. Set `DATABASE_URL` to the **transaction pooler** string (port 6543). The
   direct `db.*` host resolves to IPv6 only, which most serverless platforms
   cannot reach.
2. `npm run db:push` applies the schema.

Then, either way:

3. Create a public Storage bucket named `photos` for listing images. A
   serverless filesystem is read-only, so the `public/uploads` fallback is for
   local development only.
4. `npm run admin:hash -- 'your password'` and set `ADMIN_PASSWORD_HASH` to
   enable `/admin`; set `HASH_SALT` to a long random string.
5. Deploy to Vercel. Nothing else is required — the map needs no token.

`DATABASE_URL` wins when both are set. With neither, the app falls back to the
local file store. See `.env.example` for every variable.

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
data/localities.ts   Chennai reference data — generated, 278 localities
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

## Localities

`data/localities.ts` is generated, not hand-written:

```bash
npm run localities:build   # Wikipedia categories + OpenStreetMap Nominatim
npm run seed               # push them into the database
```

278 localities across 8 corridors. Names and coordinates come from public
sources; anything that cannot be geolocated is dropped rather than guessed,
because a wrong coordinate puts a map pin on the wrong street.

Search folds the spelling variance common in Tamil place names, so "Velacheri"
finds Velachery and "Iyappanthangal" finds Iyyappanthangal
(`foldLocalityName` in `lib/search-query.ts`).

Only corridors and tier 1–2 localities are prerendered; the rest render on
demand. Prerendering all 278 would build over a thousand pages that mostly say
"not enough renter data yet".

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
