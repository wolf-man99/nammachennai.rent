# Seed data

`npm run seed` imports files from this directory. It never generates rental data.

Drop any of these files here and re-run the command:

| File | Table |
| --- | --- |
| `rent_submissions.json` | `rent_submissions` |
| `listings.json` | `listings` |
| `tolet_reports.json` | `tolet_reports` |
| `flatmate_listings.json` | `flatmate_listings` |

Each file holds an array of records. Use `locality_slug` (from
`data/localities.ts`) instead of a locality id — the importer resolves it. Every
record is validated with the same schema the public API uses, so a bad import is
rejected rather than silently degrading the medians.

Example `rent_submissions.json`:

```json
[
  {
    "locality_slug": "sholinganallur",
    "bhk": "2BHK",
    "property_type": "apartment",
    "rent": 24500,
    "maintenance": 2500,
    "furnishing": "semi_furnished",
    "floor": 3,
    "move_in_date": "2025-06-01"
  }
]
```

Running `npm run seed` with no files present still ensures every Chennai
locality exists, which is all a fresh install needs.
