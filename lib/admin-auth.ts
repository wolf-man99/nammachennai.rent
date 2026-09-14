import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Minimal shared-secret admin gate.
 *
 * Deliberately not a user system: the MVP has one operator. The cookie carries a
 * signed, expiring token rather than the password itself.
 */

export const ADMIN_COOKIE = 'cr_admin';
const TTL_MS = 12 * 3600_000;

function secret() {
  return process.env.ADMIN_PASSWORD || '';
}

function sign(expires: number) {
  return createHmac('sha256', secret()).update(`admin.${expires}`).digest('hex');
}

export function issueToken(): string {
  const expires = Date.now() + TTL_MS;
  return `${expires}.${sign(expires)}`;
}

export function verifyToken(token: string | undefined): boolean {
  if (!token || !secret()) return false;
  const [expiresRaw, sig] = token.split('.');
  const expires = Number(expiresRaw);
  if (!expires || !sig || expires < Date.now()) return false;
  const expected = sign(expires);
  const a = Buffer.from(sig, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

export function checkPassword(candidate: string): boolean {
  const configured = secret();
  if (!configured) return false;
  const a = Buffer.from(candidate, 'utf8');
  const b = Buffer.from(configured, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  return verifyToken(jar.get(ADMIN_COOKIE)?.value);
}

export function adminConfigured(): boolean {
  return Boolean(secret());
}
