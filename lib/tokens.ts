import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Secret links.
 *
 * A token is 256 bits of randomness, so it cannot be guessed. Only its hash is
 * ever stored, so a database leak does not hand out working dashboards. The
 * hash is unsalted on purpose: it has to be looked up by value, and a
 * high-entropy token needs no stretching.
 */

export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function tokensMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

/** Normalises an Indian mobile number to the 10 digits we store everywhere. */
export function normalisePhone(phone: string): string {
  return phone.replace(/\D/g, '').slice(-10);
}

/**
 * Identifies a viewer well enough to count them once a day, without storing
 * anything that identifies a person.
 */
export function viewerHash(req: Request, listingId: string): string {
  const fwd = req.headers.get('x-forwarded-for');
  const ip = fwd?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
  const ua = req.headers.get('user-agent') || '';
  const day = new Date().toISOString().slice(0, 10);
  const salt = process.env.HASH_SALT || 'rentinchennai-dev-salt';
  return createHash('sha256').update(`${salt}|${ip}|${ua}|${listingId}|${day}`).digest('hex').slice(0, 32);
}
