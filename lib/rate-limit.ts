/**
 * Fixed-window limiter held in process memory.
 *
 * Deliberately simple: it stops casual form spam from one address, which is the
 * realistic MVP threat. Swap the map for Redis when there is more than one node.
 */

interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();
let lastSweep = Date.now();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();

  if (now - lastSweep > 60_000) {
    for (const [k, w] of windows) if (w.resetAt < now) windows.delete(k);
    lastSweep = now;
  }

  const existing = windows.get(key);
  if (!existing || existing.resetAt < now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  existing.count += 1;
  const ok = existing.count <= limit;
  return {
    ok,
    remaining: Math.max(0, limit - existing.count),
    retryAfterSeconds: ok ? 0 : Math.ceil((existing.resetAt - now) / 1000),
  };
}

/** Best-effort client address behind Vercel / any proxy. */
export function clientKey(req: Request, scope: string): string {
  const fwd = req.headers.get('x-forwarded-for');
  const ip = fwd?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
  return `${scope}:${ip}`;
}
