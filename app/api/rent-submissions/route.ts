import { ok, fail, fromZod, readJson, tooMany } from '@/lib/api';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import { rentSubmissionSchema } from '@/lib/validation/schemas';
import { assessRentSubmission, sanitiseFreeText, submitterHash } from '@/lib/quality';
import { getLocalityBySlug } from '@/services/localities';
import { recordEvent } from '@/lib/analytics/server';
import { db } from '@/lib/db';
import { CITY } from '@/lib/constants';
import type { RentSubmission } from '@/types';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const limit = rateLimit(clientKey(req, 'rent'), 10, 3600_000);
  if (!limit.ok) return tooMany(limit.retryAfterSeconds);

  const parsed = rentSubmissionSchema.safeParse(await readJson(req));
  if (!parsed.success) return fromZod(parsed.error);
  const input = parsed.data;

  const locality = await getLocalityBySlug(input.locality_slug);
  if (!locality) return fail('That locality is not on Chennai.rent yet.', 422, { locality_slug: 'Pick a Chennai locality' });

  const hash = submitterHash(req);
  const verdict = await assessRentSubmission({
    bhk: input.bhk as RentSubmission['bhk'],
    rent: input.rent,
    maintenance: input.maintenance ?? null,
    locality_id: locality.id,
    hash,
  });

  if (verdict.reject) {
    const message = verdict.flags.includes('duplicate')
      ? 'You have already reported this rent. Thank you.'
      : 'That submission could not be accepted. Please check the rent amount.';
    return fail(message, 409);
  }

  const row = await db().insert<RentSubmission>('rent_submissions', {
    city: CITY,
    locality_id: locality.id,
    latitude: input.latitude ?? locality.latitude,
    longitude: input.longitude ?? locality.longitude,
    bhk: input.bhk,
    property_type: input.property_type,
    rent: input.rent,
    maintenance: input.maintenance ?? null,
    furnishing: input.furnishing,
    floor: input.floor ?? null,
    parking: input.parking ?? null,
    society: sanitiseFreeText(input.society ?? null),
    move_in_date: input.move_in_date ?? null,
    comments: sanitiseFreeText(input.comments ?? null),
    verification_status: verdict.status,
    submitter_hash: hash,
  });

  recordEvent('rent_submission_completed', {
    locality: locality.slug,
    bhk: input.bhk,
    flags: verdict.flags,
  });

  return ok({ id: row.id, locality: { name: locality.name, slug: locality.slug } }, { status: 201 });
}
