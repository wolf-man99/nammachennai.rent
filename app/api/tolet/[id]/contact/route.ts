import { ok, fail, fromZod, readJson, tooMany } from '@/lib/api';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import { contactRequestSchema } from '@/lib/validation/schemas';
import { recordEvent } from '@/lib/analytics/server';
import { db } from '@/lib/db';
import type { ToletReport } from '@/types';

export const runtime = 'nodejs';

/** The number on a public board is still contact data - it goes through the same gate. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const limit = rateLimit(clientKey(req, 'contact'), 12, 3600_000);
  if (!limit.ok) return tooMany(limit.retryAfterSeconds);

  const parsed = contactRequestSchema.safeParse(await readJson(req));
  if (!parsed.success) return fromZod(parsed.error);

  const row = await db().get<ToletReport>('tolet_reports', id);
  if (!row || row.status !== 'active') return fail('This board is no longer listed as active.', 404);
  if (!row.phone) return fail('No number was recorded from this board.', 404);

  recordEvent('contact_owner', { tolet_id: id });
  const digits = row.phone.replace(/\D/g, '').slice(-10);
  return ok({ phone: digits, whatsapp: `https://wa.me/91${digits}` });
}
