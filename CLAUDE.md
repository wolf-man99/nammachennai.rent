# Working agreements for Rent In Chennai

## Git

**Push every change to `main`.** `main` is the live branch for this project.
After any commit, push it — do not leave work sitting locally or on a feature
branch. Keep `claude/*` working branches in sync with `main` when one is in use,
so the stop-hook check stays quiet.

```bash
git push origin HEAD:main
```

**Verify before pushing**, because `main` is what deploys:

```bash
npx tsc --noEmit && npm run lint && npm run build
```

A push that breaks `main` costs more than the minute those three commands take.

## Secrets

Never commit a credential. `.gitignore` excludes every `.env` variant except
`.env.example`. Before pushing anything that touches configuration:

```bash
npm run scan:secrets
```

It fails on credential shapes in tracked files, git history, or the client
bundle. Real values live in Vercel's environment variables and in the local,
gitignored `.env.local` — never in the repository, and never in chat.

## Data integrity

This product's entire credibility rests on not inventing numbers.

- Never seed, fabricate or demo rental figures. The empty states exist for this
  reason and must be preferred over a plausible-looking placeholder.
- A median is published only past `MIN_SAMPLE`; a BHK page is indexable only
  past `MIN_SAMPLE_INDEXABLE` (`lib/constants.ts`).
- Testing against the live Supabase project is fine, but **delete the test rows
  afterwards** — leftover fake submissions corrupt the real medians. Keep
  `localities`, which is genuine reference data.

## Privacy

- Contact details (owner phone/email, flatmate contacts, the number on a To-Let
  board) must never appear in a public payload. They are released only through
  the rate-limited `/api/<entity>/[id]/contact` endpoints.
- Rent reports are anonymous. Do not add identity fields to them.
- Published coordinates are blurred (`lib/geo.ts`). Do not expose raw ones.

## Before calling work done

- Run the app and exercise the actual change in a browser; a passing build is
  not evidence that a page renders or a form submits.
- Check phone widths (360/390/414). Most users are on a phone: no horizontal
  scroll, no clipped text, touch targets at least ~40px.
- `cache: 'no-store'` on a data read marks the route dynamic and silently breaks
  static generation for SEO pages. Reads use cache tags; writes invalidate them.
