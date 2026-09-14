import { createHash } from 'node:crypto';
import { db, eq, gte } from '@/lib/db';
import type { Bhk, VerificationStatus } from '@/types';
import { RENT_BOUNDS } from '@/lib/constants';

/**
 * Lightweight data-quality gate.
 *
 * The goal is not to catch a determined attacker, it is to keep the medians
 * honest: obvious typos, copy-paste floods and one person reporting the same
 * flat five times.
 */

/** Stable, non-reversible identifier for a submitter. Never exposed. */
export function submitterHash(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  const ip = fwd?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
  const ua = req.headers.get('user-agent') || '';
  const salt = process.env.HASH_SALT || 'chennai-rent-dev-salt';
  return createHash('sha256').update(`${salt}|${ip}|${ua}`).digest('hex').slice(0, 32);
}

/** Plausible monthly rent for a given size. Wide on purpose - it flags typos, not opinions. */
const PLAUSIBLE: Record<Bhk, [number, number]> = {
  '1RK': [2500, 45_000],
  '1BHK': [3500, 80_000],
  '2BHK': [5000, 200_000],
  '3BHK': [8000, 400_000],
  '4BHK+': [10_000, 1_000_000],
};

export interface QualityVerdict {
  status: VerificationStatus;
  flags: string[];
  /** Hard stop - the row is not written at all. */
  reject: boolean;
}

export async function assessRentSubmission(input: {
  bhk: Bhk;
  rent: number;
  maintenance?: number | null;
  locality_id: string;
  hash: string;
}): Promise<QualityVerdict> {
  const flags: string[] = [];

  if (input.rent < RENT_BOUNDS.min || input.rent > RENT_BOUNDS.max) {
    return { status: 'rejected', flags: ['rent_out_of_bounds'], reject: true };
  }

  const [lo, hi] = PLAUSIBLE[input.bhk];
  if (input.rent < lo || input.rent > hi) flags.push('rent_implausible_for_bhk');

  if (input.maintenance && input.maintenance > input.rent) flags.push('maintenance_exceeds_rent');

  const store = db();
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();

  // Burst from one submitter.
  const recent = await store.count('rent_submissions', [
    eq('submitter_hash', input.hash),
    gte('created_at', since),
  ]);
  if (recent >= 8) return { status: 'rejected', flags: ['submission_flood'], reject: true };
  if (recent >= 3) flags.push('repeat_submitter');

  // Same submitter, same locality, same size, same rent - almost certainly a re-post.
  const duplicates = await store.find('rent_submissions', {
    where: [
      eq('submitter_hash', input.hash),
      eq('locality_id', input.locality_id),
      eq('bhk', input.bhk),
      eq('rent', input.rent),
    ],
    limit: 1,
  });
  if (duplicates.length) return { status: 'rejected', flags: ['duplicate'], reject: true };

  return {
    status: flags.length ? 'pending' : 'verified',
    flags,
    reject: false,
  };
}

export async function assessListing(input: {
  bhk: Bhk;
  rent: number;
  locality_id: string;
  owner_phone: string;
}): Promise<QualityVerdict> {
  const flags: string[] = [];
  const [lo, hi] = PLAUSIBLE[input.bhk];
  if (input.rent < lo || input.rent > hi) flags.push('rent_implausible_for_bhk');

  const store = db();
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const fromPhone = await store.count('listings', [
    eq('owner_phone', input.owner_phone),
    gte('created_at', since),
  ]);
  // A genuine owner does not post six homes in a day; a broker does.
  if (fromPhone >= 6) return { status: 'rejected', flags: ['listing_flood'], reject: true };
  if (fromPhone >= 3) flags.push('possible_broker');

  const dupes = await store.find('listings', {
    where: [
      eq('owner_phone', input.owner_phone),
      eq('locality_id', input.locality_id),
      eq('bhk', input.bhk),
      eq('rent', input.rent),
      eq('status', 'active'),
    ],
    limit: 1,
  });
  if (dupes.length) flags.push('duplicate_listing');

  return { status: 'pending', flags, reject: false };
}

const SPAM_PATTERNS = [
  /\b(?:whats?app|call|contact)\s*(?:me)?\s*(?:on|at)?\s*[+\d][\d\s-]{8,}/i,
  /https?:\/\//i,
  /\b\d{10}\b/,
];

/** Strips contact details people paste into free-text fields. */
export function sanitiseFreeText(text: string | null | undefined): string | null {
  if (!text) return null;
  let out = text.trim();
  for (const p of SPAM_PATTERNS) out = out.replace(new RegExp(p.source, 'gi'), '[removed]');
  return out.slice(0, 1500) || null;
}
