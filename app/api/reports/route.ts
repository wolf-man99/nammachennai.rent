import { ok, fromZod, readJson, tooMany, handle } from '@/lib/api';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import { reportSchema } from '@/lib/validation/schemas';
import { sanitiseFreeText } from '@/lib/quality';
import { recordEvent } from '@/lib/analytics/server';
import { db } from '@/lib/db';
import type { Report } from '@/types';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  return handle(async () => {
  const limit = rateLimit(clientKey(req, 'report'), 20, 3600_000);
  if (!limit.ok) return tooMany(limit.retryAfterSeconds);

  const parsed = reportSchema.safeParse(await readJson(req));
  if (!parsed.success) return fromZod(parsed.error);
  const input = parsed.data;

  const row = await db().insert<Report>('reports', {
    entity_type: input.entity_type,
    entity_id: input.entity_id,
    reason: input.reason,
    description: sanitiseFreeText(input.description ?? null),
  });

  recordEvent('report_submitted', { entity_type: input.entity_type, reason: input.reason });
  return ok({ id: row.id }, { status: 201 });
  });
}
