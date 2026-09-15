import { ok, fail, fromZod, readJson, tooMany, handle } from '@/lib/api';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import { contactRequestSchema } from '@/lib/validation/schemas';
import { recordEvent } from '@/lib/analytics/server';
import { db } from '@/lib/db';
import type { FlatmateListing } from '@/types';

export const runtime = 'nodejs';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
  const { id } = await params;

  const limit = rateLimit(clientKey(req, 'contact'), 12, 3600_000);
  if (!limit.ok) return tooMany(limit.retryAfterSeconds);

  const parsed = contactRequestSchema.safeParse(await readJson(req));
  if (!parsed.success) return fromZod(parsed.error);

  const row = await db().get<FlatmateListing>('flatmate_listings', id);
  if (!row || row.status !== 'active') return fail('This room is no longer listed.', 404);
  if (!row.contact_phone) return fail('No contact is on file for this room.', 404);

  recordEvent('contact_owner', { flatmate_id: id });

  const digits = row.contact_phone.replace(/\D/g, '').slice(-10);
  return ok({
    owner_name: row.contact_name,
    phone: digits,
    whatsapp: `https://wa.me/91${digits}?text=${encodeURIComponent(
      'Hi, I saw your room on Rent In Chennai. Is it still available?',
    )}`,
  });
  });
}
