import { NextResponse } from 'next/server';
import { readJson } from '@/lib/api';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import { EVENTS } from '@/lib/analytics/events';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

/** First-party event sink so the funnel survives ad blockers. */
export async function POST(req: Request) {
  const limit = rateLimit(clientKey(req, 'events'), 120, 60_000);
  if (!limit.ok) return new NextResponse(null, { status: 204 });

  const body = (await readJson(req)) as { name?: string; props?: Record<string, unknown> };
  if (!body?.name || !(EVENTS as readonly string[]).includes(body.name)) {
    return new NextResponse(null, { status: 204 });
  }

  const props = body.props && typeof body.props === 'object' ? body.props : {};
  await db()
    .insert('events', { name: body.name, props })
    .catch(() => {
      /* never fail a beacon */
    });

  return new NextResponse(null, { status: 204 });
}
