import { ok, fail, fromZod, readJson, tooMany, handle } from '@/lib/api';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import { listingSchema } from '@/lib/validation/schemas';
import { assessListing, sanitiseFreeText } from '@/lib/quality';
import { getLocalityBySlug } from '@/services/localities';
import { defaultExpiry, getListings } from '@/services/listings';
import { issueOwnerToken } from '@/services/owner';
import { recordEvent } from '@/lib/analytics/server';
import { db } from '@/lib/db';
import { CITY, BHK_VALUES } from '@/lib/constants';
import type { Bhk, Listing } from '@/types';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const bhk = url.searchParams.getAll('bhk').filter((b): b is Bhk => (BHK_VALUES as string[]).includes(b));
  const maxRent = Number(url.searchParams.get('maxRent')) || undefined;
  const minRent = Number(url.searchParams.get('minRent')) || undefined;
  const limit = Math.min(60, Number(url.searchParams.get('limit')) || 24);

  const listings = await getListings({ bhk, maxRent, minRent, limit });
  return ok(listings);
}

export async function POST(req: Request) {
  return handle(async () => {
  const limit = rateLimit(clientKey(req, 'listing'), 6, 3600_000);
  if (!limit.ok) return tooMany(limit.retryAfterSeconds);

  const parsed = listingSchema.safeParse(await readJson(req));
  if (!parsed.success) return fromZod(parsed.error);
  const input = parsed.data;

  const locality = await getLocalityBySlug(input.locality_slug);
  if (!locality) return fail('That locality is not on Rent In Chennai yet.', 422, { locality_slug: 'Pick a Chennai locality' });

  const phone = input.owner_phone.replace(/[\s-]/g, '').slice(-10);
  const verdict = await assessListing({
    bhk: input.bhk as Bhk,
    rent: input.rent,
    locality_id: locality.id,
    owner_phone: phone,
  });
  if (verdict.reject) {
    return fail(
      'That is a lot of listings from one number today. Rent In Chennai is owner-direct only — email us if you manage several homes.',
      409,
    );
  }

  const store = db();
  const row = await store.insert<Listing>('listings', {
    city: CITY,
    locality_id: locality.id,
    latitude: input.latitude ?? locality.latitude,
    longitude: input.longitude ?? locality.longitude,
    bhk: input.bhk,
    property_type: input.property_type,
    rent: input.rent,
    maintenance: input.maintenance ?? null,
    deposit: input.deposit ?? null,
    furnishing: input.furnishing,
    parking: input.parking ?? null,
    area_sqft: input.area_sqft ?? null,
    available_from: input.available_from ?? null,
    title: sanitiseFreeText(input.title ?? null),
    description: sanitiseFreeText(input.description ?? null),
    status: 'active',
    verification_status: verdict.status,
    owner_name: input.owner_name,
    owner_phone: phone,
    owner_email: input.owner_email || null,
    expires_at: defaultExpiry(),
  });

  const photos = (input.photos ?? []).filter(Boolean).slice(0, 8);
  if (photos.length) {
    await store.insertMany(
      'listing_photos',
      photos.map((url, i) => ({ listing_id: row.id, url, position: i })),
    );
  }

  recordEvent('listing_completed', { locality: locality.slug, bhk: input.bhk, flags: verdict.flags });

  // Shown once, on the success screen. Only its hash is stored, so it cannot be
  // recovered later - which is why the UI tells the owner to keep it.
  const manageToken = await issueOwnerToken(phone).catch(() => null);

  return ok({ id: row.id, manageToken }, { status: 201 });
  });
}
