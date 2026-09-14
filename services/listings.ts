import { db, eq, gte, inList, lte, type Condition } from '@/lib/db';
import { CITY } from '@/lib/constants';
import type { Bhk, Furnishing, Listing, ListingPhoto, Locality, PropertyType, PublicListing } from '@/types';
import { getLocalityMap } from './localities';
import { computeStats } from './rent-stats';

/** Never let owner contact fields leave the server through a listing payload. */
export function toPublicListing(listing: Listing, locality: Locality | null, photos: string[] = []): PublicListing {
  const {
    owner_id: _ownerId,
    owner_name: _ownerName,
    owner_phone: _ownerPhone,
    owner_email: _ownerEmail,
    ...safe
  } = listing;
  return { ...safe, locality, photos };
}

export interface ListingFilters {
  localityIds?: string[];
  bhk?: Bhk[];
  minRent?: number;
  maxRent?: number;
  furnishing?: Furnishing[];
  propertyType?: PropertyType[];
  limit?: number;
  offset?: number;
}

function buildWhere(filters: ListingFilters): Condition[] {
  const where: Condition[] = [eq('city', CITY), eq('status', 'active')];
  if (filters.localityIds?.length) where.push(inList('locality_id', filters.localityIds));
  if (filters.bhk?.length) where.push(inList('bhk', filters.bhk));
  if (filters.furnishing?.length) where.push(inList('furnishing', filters.furnishing));
  if (filters.propertyType?.length) where.push(inList('property_type', filters.propertyType));
  if (filters.minRent) where.push(gte('rent', filters.minRent));
  if (filters.maxRent) where.push(lte('rent', filters.maxRent));
  return where;
}

export async function getListings(filters: ListingFilters = {}): Promise<PublicListing[]> {
  const rows = await db().find<Listing>('listings', {
    where: buildWhere(filters),
    orderBy: { field: 'created_at', dir: 'desc' },
    limit: filters.limit,
    offset: filters.offset,
  });
  return attachDetails(rows);
}

export async function countListings(filters: ListingFilters = {}): Promise<number> {
  return db().count('listings', buildWhere(filters));
}

export async function attachDetails(rows: Listing[]): Promise<PublicListing[]> {
  if (!rows.length) return [];
  const [localityMap, photos] = await Promise.all([
    getLocalityMap(),
    db().find<ListingPhoto>('listing_photos', {
      where: [inList('listing_id', rows.map((r) => r.id))],
      orderBy: { field: 'position', dir: 'asc' },
    }),
  ]);
  const photosByListing = new Map<string, string[]>();
  for (const p of photos) {
    const list = photosByListing.get(p.listing_id) ?? [];
    list.push(p.url);
    photosByListing.set(p.listing_id, list);
  }
  return rows.map((r) =>
    toPublicListing(r, localityMap.get(r.locality_id) ?? null, photosByListing.get(r.id) ?? []),
  );
}

export async function getListing(id: string): Promise<PublicListing | null> {
  const row = await db().get<Listing>('listings', id);
  if (!row || row.status === 'hidden') return null;
  const [detailed] = await attachDetails([row]);
  return detailed ?? null;
}

/** Raw row including contact fields. Server-only callers. */
export async function getListingPrivate(id: string): Promise<Listing | null> {
  return db().get<Listing>('listings', id);
}

/**
 * "Is this rent fair?" - comparable homes and renter reports for the same
 * locality and size, so the number on the page has context.
 */
export async function getRentContext(listing: PublicListing) {
  const store = db();
  const [submissions, comparables] = await Promise.all([
    store.find<{ rent: number }>('rent_submissions', {
      where: [
        eq('locality_id', listing.locality_id),
        eq('bhk', listing.bhk),
        inList('verification_status', ['pending', 'verified']),
      ],
    }),
    store.find<Listing>('listings', {
      where: [
        eq('locality_id', listing.locality_id),
        eq('bhk', listing.bhk),
        eq('status', 'active'),
        { field: 'id', op: 'neq', value: listing.id },
      ],
      orderBy: { field: 'created_at', dir: 'desc' },
      limit: 6,
    }),
  ]);

  const reported = computeStats(submissions.map((s) => s.rent));
  const comparableRents = comparables.map((c) => c.rent).sort((a, b) => a - b);

  let verdict: 'below' | 'around' | 'above' | null = null;
  if (reported) {
    const delta = (listing.rent - reported.median) / reported.median;
    verdict = delta < -0.08 ? 'below' : delta > 0.08 ? 'above' : 'around';
  }

  return {
    reported,
    comparableRents,
    comparables: await attachDetails(comparables),
    verdict,
    deltaPct: reported ? Number((((listing.rent - reported.median) / reported.median) * 100).toFixed(1)) : null,
  };
}

export async function getSimilarListings(listing: PublicListing, limit = 3): Promise<PublicListing[]> {
  const rows = await db().find<Listing>('listings', {
    where: [
      eq('city', CITY),
      eq('status', 'active'),
      eq('locality_id', listing.locality_id),
      { field: 'id', op: 'neq', value: listing.id },
    ],
    orderBy: { field: 'created_at', dir: 'desc' },
    limit,
  });
  if (rows.length >= limit) return attachDetails(rows);

  const extra = await db().find<Listing>('listings', {
    where: [eq('city', CITY), eq('status', 'active'), eq('bhk', listing.bhk)],
    orderBy: { field: 'created_at', dir: 'desc' },
    limit: limit * 3,
  });
  const seen = new Set([listing.id, ...rows.map((r) => r.id)]);
  for (const row of extra) {
    if (rows.length >= limit) break;
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    rows.push(row);
  }
  return attachDetails(rows);
}

/** Listings older than the TTL stop appearing without anyone touching the DB. */
export const LISTING_TTL_DAYS = 60;

export function defaultExpiry(): string {
  return new Date(Date.now() + LISTING_TTL_DAYS * 86_400_000).toISOString();
}
