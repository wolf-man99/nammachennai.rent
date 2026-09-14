import { db, eq, inList } from '@/lib/db';
import { BHK_VALUES, CITY } from '@/lib/constants';
import { haversineKm } from '@/lib/geo';
import type { Bhk, Listing, Locality, Match, PublicListing, Seeker } from '@/types';
import { attachDetails } from './listings';
import { getLocalityMap } from './localities';

/**
 * Deterministic matching.
 *
 * No model, no embeddings - a weighted score over five explainable factors so a
 * renter can be told exactly why a home surfaced. Weights sum to 1.
 */

const WEIGHTS = {
  distance: 0.34,
  budget: 0.28,
  bhk: 0.2,
  preference: 0.1,
  freshness: 0.08,
} as const;

/** Anything scoring below this is noise, not a match. */
export const MATCH_THRESHOLD = 0.42;
export const MAX_MATCHES = 25;

function bhkIndex(bhk: Bhk): number {
  return BHK_VALUES.indexOf(bhk);
}

function distanceScore(km: number, radiusKm: number): number {
  if (km <= radiusKm * 0.35) return 1;
  if (km <= radiusKm) return 1 - (km - radiusKm * 0.35) / (radiusKm * 0.65) * 0.45;
  // Just outside the radius still counts, with a steep penalty.
  if (km <= radiusKm * 1.5) return 0.3;
  return 0;
}

function budgetScore(rent: number, seeker: Seeker): number {
  const max = seeker.max_rent;
  const min = seeker.min_rent ?? 0;
  if (rent < min) return 0.55;
  if (rent <= max * 0.85) return 1;
  if (rent <= max) return 0.9;
  if (rent <= max * 1.1) return 0.45; // worth showing - most renters stretch 10%
  return 0;
}

function bhkScore(listingBhk: Bhk, wanted: Bhk): number {
  const diff = Math.abs(bhkIndex(listingBhk) - bhkIndex(wanted));
  if (diff === 0) return 1;
  if (diff === 1) return 0.55;
  return 0;
}

function preferenceScore(listing: Listing, seeker: Seeker): number {
  let hits = 0;
  let total = 0;

  if (seeker.furnishing) {
    total += 1;
    if (listing.furnishing === seeker.furnishing) hits += 1;
    else if (listing.furnishing === 'semi_furnished') hits += 0.5;
  }
  if (seeker.property_type) {
    total += 1;
    if (listing.property_type === seeker.property_type) hits += 1;
  }
  if (seeker.move_in_date) {
    total += 1;
    const wanted = new Date(seeker.move_in_date).getTime();
    const available = listing.available_from ? new Date(listing.available_from).getTime() : 0;
    if (!available || available <= wanted + 21 * 86_400_000) hits += 1;
  }
  return total === 0 ? 0.7 : hits / total;
}

function freshnessScore(createdAt: string): number {
  const days = (Date.now() - new Date(createdAt).getTime()) / 86_400_000;
  if (days <= 3) return 1;
  if (days <= 14) return 0.8;
  if (days <= 30) return 0.55;
  return 0.3;
}

export interface ScoredMatch {
  listing: Listing;
  score: number;
  distanceKm: number;
  reasons: string[];
}

export function scoreListing(
  listing: Listing,
  seeker: Seeker,
  listingLocality: Locality | null,
  seekerPoint: { latitude: number; longitude: number },
): ScoredMatch | null {
  const point = {
    latitude: listing.latitude ?? listingLocality?.latitude ?? null,
    longitude: listing.longitude ?? listingLocality?.longitude ?? null,
  };
  if (point.latitude === null || point.longitude === null) return null;

  const distanceKm = haversineKm(seekerPoint, {
    latitude: point.latitude,
    longitude: point.longitude,
  });

  const parts = {
    distance: distanceScore(distanceKm, seeker.radius_km),
    budget: budgetScore(listing.rent, seeker),
    bhk: bhkScore(listing.bhk, seeker.bhk),
    preference: preferenceScore(listing, seeker),
    freshness: freshnessScore(listing.created_at),
  };

  // A home outside the budget or the wrong size is not a match at any distance.
  if (parts.budget === 0 || parts.bhk === 0 || parts.distance === 0) return null;

  const score =
    parts.distance * WEIGHTS.distance +
    parts.budget * WEIGHTS.budget +
    parts.bhk * WEIGHTS.bhk +
    parts.preference * WEIGHTS.preference +
    parts.freshness * WEIGHTS.freshness;

  const reasons: string[] = [];
  if (distanceKm < 0.6) reasons.push('In the locality you asked for');
  else if (parts.distance >= 0.9) reasons.push(`${distanceKm.toFixed(1)} km from where you are looking`);
  if (parts.budget === 1) reasons.push('Comfortably inside your budget');
  else if (parts.budget >= 0.9) reasons.push('At the top of your budget');
  if (parts.bhk === 1) reasons.push('Exactly the size you want');
  if (parts.freshness === 1) reasons.push('Listed in the last few days');

  return { listing, score: Number(score.toFixed(4)), distanceKm: Number(distanceKm.toFixed(2)), reasons };
}

export async function findMatches(seeker: Seeker): Promise<ScoredMatch[]> {
  const localityMap = await getLocalityMap();
  const seekerLocality = localityMap.get(seeker.locality_id) ?? null;
  const seekerPoint = {
    latitude: seeker.latitude ?? seekerLocality?.latitude ?? null,
    longitude: seeker.longitude ?? seekerLocality?.longitude ?? null,
  };
  if (seekerPoint.latitude === null || seekerPoint.longitude === null) return [];

  const candidates = await db().find<Listing>('listings', {
    where: [eq('city', CITY), eq('status', 'active'), inList('verification_status', ['pending', 'verified'])],
    orderBy: { field: 'created_at', dir: 'desc' },
    limit: 500,
  });

  return candidates
    .map((l) =>
      scoreListing(l, seeker, localityMap.get(l.locality_id) ?? null, {
        latitude: seekerPoint.latitude as number,
        longitude: seekerPoint.longitude as number,
      }),
    )
    .filter((m): m is ScoredMatch => m !== null && m.score >= MATCH_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_MATCHES);
}

/** Runs the engine and persists the result so the seeker can be notified later. */
export async function createMatchesForSeeker(seeker: Seeker): Promise<ScoredMatch[]> {
  const matches = await findMatches(seeker);
  if (matches.length) {
    await db().insertMany(
      'matches',
      matches.map((m) => ({
        seeker_id: seeker.id,
        listing_id: m.listing.id,
        match_score: m.score,
        distance_km: m.distanceKm,
      })),
    );
  }
  return matches;
}

export interface SeekerMatchView {
  listing: PublicListing;
  score: number;
  distanceKm: number;
}

export async function getMatchesForSeeker(seekerId: string): Promise<SeekerMatchView[]> {
  const matches = await db().find<Match>('matches', {
    where: [eq('seeker_id', seekerId)],
    orderBy: { field: 'match_score', dir: 'desc' },
  });
  if (!matches.length) return [];

  const listings = await db().find<Listing>('listings', {
    where: [inList('id', matches.map((m) => m.listing_id))],
  });
  const detailed = await attachDetails(listings);
  const byId = new Map(detailed.map((l) => [l.id, l]));

  return matches
    .map((m) => {
      const listing = byId.get(m.listing_id);
      return listing ? { listing, score: m.match_score, distanceKm: m.distance_km } : null;
    })
    .filter((x): x is SeekerMatchView => x !== null);
}
