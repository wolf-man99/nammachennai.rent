import { ok, fail, fromZod, readJson, tooMany, handle } from '@/lib/api';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import { toletSchema } from '@/lib/validation/schemas';
import { sanitiseFreeText } from '@/lib/quality';
import { getLocalityBySlug } from '@/services/localities';
import { recordEvent } from '@/lib/analytics/server';
import { db } from '@/lib/db';
import { CITY } from '@/lib/constants';
import type { ToletReport } from '@/types';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  return handle(async () => {
  const limit = rateLimit(clientKey(req, 'tolet'), 15, 3600_000);
  if (!limit.ok) return tooMany(limit.retryAfterSeconds);

  const parsed = toletSchema.safeParse(await readJson(req));
  if (!parsed.success) return fromZod(parsed.error);
  const input = parsed.data;

  const locality = await getLocalityBySlug(input.locality_slug);
  if (!locality) return fail('That locality is not on NammaChennai.rent yet.', 422, { locality_slug: 'Pick a Chennai locality' });

  const seen = new Date(input.seen_at);
  if (seen.getTime() > Date.now() + 86_400_000) {
    return fail('A board cannot be seen in the future.', 422, { seen_at: 'Pick today or an earlier date' });
  }

  const row = await db().insert<ToletReport>('tolet_reports', {
    city: CITY,
    locality_id: locality.id,
    latitude: input.latitude ?? locality.latitude,
    longitude: input.longitude ?? locality.longitude,
    photo: input.photo ?? null,
    rent: input.rent ?? null,
    bhk: input.bhk ?? null,
    phone: input.phone ? input.phone.replace(/[\s-]/g, '').slice(-10) : null,
    landmark: sanitiseFreeText(input.landmark ?? null),
    seen_at: input.seen_at,
    status: 'active',
  });

  recordEvent('tolet_submission', { locality: locality.slug });
  return ok({ id: row.id }, { status: 201 });
  });
}
