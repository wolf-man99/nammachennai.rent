import { db, eq, inList } from '@/lib/db';
import { generateToken, hashToken, normalisePhone } from '@/lib/tokens';
import { attachDetails } from './listings';
import type { Listing, ListingEnquiry, ListingView, OwnerAccess, OwnerListingSummary } from '@/types';

/**
 * Owner dashboards without accounts.
 *
 * The listing already carries the owner's phone number, so the only question is
 * how they prove they hold it. A secret link answers that today; phone OTP can
 * answer it later without changing anything here, because the dashboard is
 * keyed by phone either way.
 */

/**
 * Returns the owner's dashboard token, creating their access row on first
 * listing. The raw token is returned only here - afterwards only its hash
 * exists, so it can be shown once and never recovered from the database.
 */
export async function issueOwnerToken(rawPhone: string): Promise<string> {
  const phone = normalisePhone(rawPhone);
  const store = db();

  const existing = await store.find<OwnerAccess>('owner_access', {
    where: [eq('phone', phone)],
    limit: 1,
  });
  if (existing.length) {
    // The stored hash cannot be reversed, so re-issue and replace it. The old
    // link stops working, which is the correct behaviour for a fresh listing.
    const token = generateToken();
    await store.update('owner_access', existing[0].id, { token_hash: hashToken(token) });
    return token;
  }

  const token = generateToken();
  await store.insert<OwnerAccess>('owner_access', { phone, token_hash: hashToken(token) });
  return token;
}

export async function resolveOwnerByToken(token: string): Promise<OwnerAccess | null> {
  if (!token || token.length < 20) return null;
  const rows = await db().find<OwnerAccess>('owner_access', {
    where: [eq('token_hash', hashToken(token))],
    limit: 1,
  });
  return rows[0] ?? null;
}

export async function touchOwner(id: string) {
  await db()
    .update('owner_access', id, { last_seen_at: new Date().toISOString() })
    .catch(() => {
      /* a failed timestamp must never block the dashboard */
    });
}

/** Every listing this phone number has published, with its performance. */
export async function getOwnerListings(phone: string): Promise<OwnerListingSummary[]> {
  const store = db();
  const rows = await store.find<Listing>('listings', {
    where: [eq('owner_phone', normalisePhone(phone))],
    orderBy: { field: 'created_at', dir: 'desc' },
  });
  if (!rows.length) return [];

  const ids = rows.map((r) => r.id);
  const [detailed, views, enquiries] = await Promise.all([
    attachDetails(rows),
    store.find<ListingView>('listing_views', { where: [inList('listing_id', ids)] }),
    store.find<ListingEnquiry>('listing_enquiries', {
      where: [inList('listing_id', ids)],
      orderBy: { field: 'created_at', dir: 'desc' },
    }),
  ]);

  const viewsByListing = new Map<string, number>();
  for (const v of views) viewsByListing.set(v.listing_id, (viewsByListing.get(v.listing_id) ?? 0) + 1);

  const enquiriesByListing = new Map<string, ListingEnquiry[]>();
  for (const e of enquiries) {
    enquiriesByListing.set(e.listing_id, [...(enquiriesByListing.get(e.listing_id) ?? []), e]);
  }

  // attachDetails drops hidden listings from nothing, but preserve owner order.
  const byId = new Map(detailed.map((l) => [l.id, l]));
  return rows
    .map((r) => {
      const listing = byId.get(r.id);
      if (!listing) return null;
      return {
        listing,
        views: viewsByListing.get(r.id) ?? 0,
        enquiries: enquiriesByListing.get(r.id) ?? [],
      };
    })
    .filter((x): x is OwnerListingSummary => x !== null);
}

/** Counts a viewer once per listing per day; a repeat visit is not a new view. */
export async function recordListingView(listingId: string, hash: string) {
  const store = db();
  try {
    const seen = await store.find<ListingView>('listing_views', {
      where: [eq('listing_id', listingId), eq('viewer_hash', hash)],
      limit: 1,
    });
    if (seen.length) return;
    await store.insert('listing_views', { listing_id: listingId, viewer_hash: hash });
  } catch {
    /* view counting must never break the property page */
  }
}

export async function recordEnquiry(listingId: string, name: string, phone: string) {
  await db()
    .insert('listing_enquiries', {
      listing_id: listingId,
      name: name.trim().slice(0, 80),
      phone: normalisePhone(phone),
    })
    .catch(() => {
      /* the renter still gets the number even if logging fails */
    });
}

/** Actions an owner may take on their own listing. */
export type OwnerAction = 'mark_rented' | 'republish' | 'unpublish';

export async function applyOwnerAction(
  ownerPhone: string,
  listingId: string,
  action: OwnerAction,
): Promise<boolean> {
  const store = db();
  const listing = await store.get<Listing>('listings', listingId);
  // Ownership is checked here, not in the route: the token proves a phone
  // number, and a phone number may only touch its own listings.
  if (!listing || listing.owner_phone !== normalisePhone(ownerPhone)) return false;

  const patch =
    action === 'mark_rented'
      ? { status: 'rented' }
      : action === 'unpublish'
        ? { status: 'hidden' }
        : { status: 'active' };

  await store.update('listings', listingId, patch);
  return true;
}
