import { NextResponse } from 'next/server';
import { viewerHash } from '@/lib/tokens';
import { recordListingView } from '@/services/owner';
import { getListingPrivate } from '@/services/listings';

export const runtime = 'nodejs';

/**
 * Counts a view of a property page.
 *
 * A beacon rather than a server-render side effect: the property page is
 * statically generated and cached, so counting during render would miss most
 * visits and would also count crawlers and prerenders.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Ignore obvious bots - an owner's view count should mean people.
  const ua = req.headers.get('user-agent') ?? '';
  if (/bot|crawler|spider|preview|curl|wget|headless/i.test(ua)) {
    return new NextResponse(null, { status: 204 });
  }

  const listing = await getListingPrivate(id).catch(() => null);
  if (listing) await recordListingView(id, viewerHash(req, id));

  return new NextResponse(null, { status: 204 });
}
