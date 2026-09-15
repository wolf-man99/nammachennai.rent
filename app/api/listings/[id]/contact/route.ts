import { ok, fail, fromZod, readJson, tooMany, handle } from '@/lib/api';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import { contactRequestSchema } from '@/lib/validation/schemas';
import { getListingPrivate } from '@/services/listings';
import { recordEvent } from '@/lib/analytics/server';
import { recordEnquiry } from '@/services/owner';

export const runtime = 'nodejs';

/**
 * The only path by which an owner's number reaches a renter.
 *
 * Contact details are never part of a listing payload; a renter has to identify
 * themselves first, and the reveal is rate limited per address.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
  const { id } = await params;

  const limit = rateLimit(clientKey(req, 'contact'), 12, 3600_000);
  if (!limit.ok) return tooMany(limit.retryAfterSeconds);

  const parsed = contactRequestSchema.safeParse(await readJson(req));
  if (!parsed.success) return fromZod(parsed.error);

  const listing = await getListingPrivate(id);
  if (!listing || listing.status !== 'active') return fail('This home is no longer available.', 404);
  if (listing.verification_status === 'rejected') return fail('This listing is under review.', 403);
  if (!listing.owner_phone) return fail('No contact is on file for this home.', 404);

  // Analytics is prunable; an enquiry is a business record the owner needs to
  // call this person back, so it gets its own table.
  await recordEnquiry(id, parsed.data.name, parsed.data.phone);
  recordEvent('contact_owner', { listing_id: id });

  const digits = listing.owner_phone.replace(/\D/g, '').slice(-10);
  return ok({
    owner_name: listing.owner_name,
    phone: digits,
    whatsapp: `https://wa.me/91${digits}?text=${encodeURIComponent(
      `Hi, I saw your ${listing.bhk.replace('BHK', ' BHK')} on Rent In Chennai. Is it still available?`,
    )}`,
  });
  });
}
