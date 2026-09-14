/**
 * Seed / import.
 *
 * This script never invents rental data. It does two things:
 *   1. ensures every locality in data/localities.ts exists, and
 *   2. imports legitimate structured records from data/seed/*.json.
 *
 * Each file is named after its table (rent_submissions.json, listings.json,
 * tolet_reports.json, flatmate_listings.json) and holds an array of records that
 * use `locality_slug` instead of a locality id. Records are validated with the
 * same schemas the public API uses, so imported data cannot be lower quality
 * than data a renter submits.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { db, eq } from '../lib/db';
import { CHENNAI_LOCALITIES } from '../data/localities';
import { CITY } from '../lib/constants';
import {
  flatmateSchema,
  listingSchema,
  rentSubmissionSchema,
  toletSchema,
} from '../lib/validation/schemas';
import type { Locality } from '../types';
import type { TableName } from '../lib/db/schema';
import type { z } from 'zod';

const SEED_DIR = path.join(process.cwd(), 'data', 'seed');

const IMPORTS: { file: string; table: TableName; schema: z.ZodTypeAny }[] = [
  { file: 'rent_submissions.json', table: 'rent_submissions', schema: rentSubmissionSchema },
  { file: 'listings.json', table: 'listings', schema: listingSchema },
  { file: 'tolet_reports.json', table: 'tolet_reports', schema: toletSchema },
  { file: 'flatmate_listings.json', table: 'flatmate_listings', schema: flatmateSchema },
];

async function seedLocalities(): Promise<Map<string, Locality>> {
  const store = db();
  const existing = await store.find<Locality>('localities', { where: [eq('city', CITY)] });
  const bySlug = new Map(existing.map((l) => [l.slug, l]));

  const missing = CHENNAI_LOCALITIES.filter((l) => !bySlug.has(l.slug));
  if (missing.length) {
    const created = await store.insertMany<Locality>(
      'localities',
      missing.map((l) => ({ ...l, city: CITY })),
    );
    for (const l of created) bySlug.set(l.slug, l);
    console.log(`  localities: inserted ${created.length}`);
  } else {
    console.log('  localities: already up to date');
  }
  return bySlug;
}

async function readSeedFile(file: string): Promise<unknown[] | null> {
  try {
    const raw = await fs.readFile(path.join(SEED_DIR, file), 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function main() {
  console.log(`Seeding ${db().driver === 'postgres' ? 'Postgres' : 'local file store'}…`);

  if (db().driver === 'postgres') await db().migrate();
  const localities = await seedLocalities();

  for (const { file, table, schema } of IMPORTS) {
    const records = await readSeedFile(file);
    if (!records) {
      console.log(`  ${file}: not present — skipped`);
      continue;
    }

    const rows: Record<string, unknown>[] = [];
    let rejected = 0;

    for (const [i, record] of records.entries()) {
      const parsed = schema.safeParse(record);
      if (!parsed.success) {
        rejected += 1;
        console.warn(`  ${file}[${i}]: ${parsed.error.issues[0]?.message ?? 'invalid'}`);
        continue;
      }
      const { locality_slug: slug, photos: _photos, ...rest } = parsed.data as Record<string, unknown> & {
        locality_slug: string;
        photos?: string[];
      };
      const locality = localities.get(slug);
      if (!locality) {
        rejected += 1;
        console.warn(`  ${file}[${i}]: unknown locality "${slug}"`);
        continue;
      }
      rows.push({
        ...rest,
        city: CITY,
        locality_id: locality.id,
        latitude: (rest.latitude as number | null) ?? locality.latitude,
        longitude: (rest.longitude as number | null) ?? locality.longitude,
        // Imported records are reviewed data, not anonymous submissions.
        ...(table === 'rent_submissions' ? { verification_status: 'verified' } : {}),
        ...(table === 'listings' || table === 'flatmate_listings'
          ? { status: 'active', verification_status: 'verified' }
          : {}),
        ...(table === 'tolet_reports' ? { status: 'active' } : {}),
      });
    }

    if (rows.length) await db().insertMany(table, rows);
    console.log(`  ${file}: imported ${rows.length}${rejected ? `, rejected ${rejected}` : ''}`);
  }

  console.log('Done.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
