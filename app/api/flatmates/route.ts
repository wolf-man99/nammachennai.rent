import { ok, fail, fromZod, readJson, tooMany, handle } from '@/lib/api';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import { flatmateSchema } from '@/lib/validation/schemas';
import { sanitiseFreeText } from '@/lib/quality';
import { getLocalityBySlug } from '@/services/localities';
import { recordEvent } from '@/lib/analytics/server';
import { db } from '@/lib/db';
import { CITY } from '@/lib/constants';
import type { FlatmateListing } from '@/types';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  return handle(async () => {
  const limit = rateLimit(clientKey(req, 'flatmate'), 6, 3600_000);
  if (!limit.ok) return tooMany(limit.retryAfterSeconds);

  const parsed = flatmateSchema.safeParse(await readJson(req));
  if (!parsed.success) return fromZod(parsed.error);
  const input = parsed.data;

  const locality = await getLocalityBySlug(input.locality_slug);
  if (!locality) return fail('That locality is not on Chennai.rent yet.', 422, { locality_slug: 'Pick a Chennai locality' });

  const row = await db().insert<FlatmateListing>('flatmate_listings', {
    city: CITY,
    locality_id: locality.id,
    latitude: input.latitude ?? locality.latitude,
    longitude: input.longitude ?? locality.longitude,
    rent: input.rent,
    room_type: input.room_type,
    total_bhk: input.total_bhk,
    gender_preference: input.gender_preference,
    furnishing: input.furnishing,
    move_in_date: input.move_in_date ?? null,
    description: sanitiseFreeText(input.description ?? null),
    status: 'active',
    verification_status: 'pending',
    contact_name: input.contact_name,
    contact_phone: input.contact_phone.replace(/[\s-]/g, '').slice(-10),
    contact_email: input.contact_email || null,
  });

  recordEvent('flatmate_submission', { locality: locality.slug, room_type: input.room_type });
  return ok({ id: row.id }, { status: 201 });
  });
}
