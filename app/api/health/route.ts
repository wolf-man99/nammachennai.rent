import { NextResponse } from 'next/server';
import { db, dataLayerConfigured, driverLabel } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * One URL that answers "why isn't anything saving?".
 *
 * Reports which driver is active, whether credentials are present, and whether a
 * real read succeeds. It deliberately reports only booleans and names — never a
 * key, a host or a connection string.
 */
export async function GET() {
  const checks: Record<string, unknown> = {
    configured: dataLayerConfigured(),
    has_database_url: Boolean(process.env.DATABASE_URL),
    has_supabase_url: Boolean(process.env.SUPABASE_URL),
    has_supabase_secret: Boolean(
      process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
    ),
    node_env: process.env.NODE_ENV ?? 'unknown',
  };

  try {
    checks.driver = driverLabel();
    const started = Date.now();
    const localities = await db().find('localities', { limit: 1 });
    checks.read_ok = true;
    checks.read_ms = Date.now() - started;
    checks.localities_seeded = localities.length > 0;
  } catch (err) {
    checks.read_ok = false;
    checks.error = err instanceof Error ? err.message.slice(0, 300) : String(err).slice(0, 300);
  }

  const healthy = checks.configured === true && checks.read_ok === true;
  return NextResponse.json(
    { ok: healthy, data: checks },
    { status: healthy ? 200 : 503, headers: { 'cache-control': 'no-store' } },
  );
}
