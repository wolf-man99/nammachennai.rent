import { ok, fail, fromZod, readJson, tooMany, handle } from '@/lib/api';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import { seekerSchema } from '@/lib/validation/schemas';
import { getLocalityBySlug } from '@/services/localities';
import { createMatchesForSeeker } from '@/services/matching';
import { toPublicListing } from '@/services/listings';
import { getLocalityMap } from '@/services/localities';
import { recordEvent } from '@/lib/analytics/server';
import { db } from '@/lib/db';
import { CITY } from '@/lib/constants';
import type { Seeker } from '@/types';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  return handle(async () => {
  const limit = rateLimit(clientKey(req, 'seeker'), 8, 3600_000);
  if (!limit.ok) return tooMany(limit.retryAfterSeconds);

  const parsed = seekerSchema.safeParse(await readJson(req));
  if (!parsed.success) return fromZod(parsed.error);
  const input = parsed.data;

  const locality = await getLocalityBySlug(input.locality_slug);
  if (!locality) return fail('That locality is not on Chennai.rent yet.', 422, { locality_slug: 'Pick a Chennai locality' });

  const seeker = await db().insert<Seeker>('seekers', {
    city: CITY,
    locality_id: locality.id,
    latitude: input.latitude ?? locality.latitude,
    longitude: input.longitude ?? locality.longitude,
    radius_km: input.radius_km,
    min_rent: input.min_rent ?? null,
    max_rent: input.max_rent,
    bhk: input.bhk,
    furnishing: input.furnishing ?? null,
    property_type: input.property_type ?? null,
    move_in_date: input.move_in_date ?? null,
    room_or_full: input.room_or_full,
    contact_name: input.contact_name,
    contact_phone: input.contact_phone.replace(/[\s-]/g, '').slice(-10),
    contact_email: input.contact_email || null,
  });

  const matches = await createMatchesForSeeker(seeker);
  const localityMap = await getLocalityMap();

  recordEvent('seeker_completed', { locality: locality.slug, bhk: input.bhk, matches: matches.length });
  if (matches.length) recordEvent('match_created', { seeker_id: seeker.id, count: matches.length });

  return ok(
    {
      id: seeker.id,
      matches: matches.map((m) => ({
        listing: toPublicListing(m.listing, localityMap.get(m.listing.locality_id) ?? null),
        score: Math.round(m.score * 100),
        distanceKm: m.distanceKm,
        reasons: m.reasons,
      })),
    },
    { status: 201 },
  );
  });
}
