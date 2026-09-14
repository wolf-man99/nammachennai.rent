import { NextResponse } from 'next/server';
import { fail, readJson, tooMany } from '@/lib/api';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import { ADMIN_COOKIE, adminConfigured, checkPassword, issueToken } from '@/lib/admin-auth';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  // Tight limit: this is the one endpoint worth brute forcing.
  const limit = rateLimit(clientKey(req, 'admin-login'), 5, 600_000);
  if (!limit.ok) return tooMany(limit.retryAfterSeconds);

  if (!adminConfigured()) {
    return fail('Admin access is not configured. Set ADMIN_PASSWORD to enable it.', 503);
  }

  const body = (await readJson(req)) as { password?: string };
  if (!body.password || !checkPassword(body.password)) {
    return fail('Incorrect password.', 401);
  }

  const res = NextResponse.json({ ok: true, data: { ok: true } });
  res.cookies.set(ADMIN_COOKIE, issueToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 12 * 3600,
  });
  return res;
}
