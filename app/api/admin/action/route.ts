import { ok, fail, readJson } from '@/lib/api';
import { isAdmin } from '@/lib/admin-auth';
import { db, type TableName } from '@/lib/db';

export const runtime = 'nodejs';

type Action = 'approve' | 'reject' | 'flag' | 'mark_rented' | 'mark_stale' | 'delete' | 'restore';

const MODERATED: Record<string, TableName> = {
  rent_submission: 'rent_submissions',
  listing: 'listings',
  flatmate_listing: 'flatmate_listings',
  tolet_report: 'tolet_reports',
  report: 'reports',
};

/** Field patches per action, per table. Anything not listed here is rejected. */
function patchFor(table: TableName, action: Action): Record<string, unknown> | null {
  const verification = (status: string) => ({ verification_status: status });

  switch (table) {
    case 'rent_submissions':
      if (action === 'approve') return verification('verified');
      if (action === 'reject') return verification('rejected');
      if (action === 'flag') return verification('unverified');
      return null;
    case 'listings':
    case 'flatmate_listings':
      if (action === 'approve') return verification('verified');
      if (action === 'reject') return { ...verification('rejected'), status: 'hidden' };
      if (action === 'flag') return verification('unverified');
      if (action === 'mark_rented') return { status: 'rented' };
      if (action === 'restore') return { status: 'active' };
      return null;
    case 'tolet_reports':
      if (action === 'approve') return { status: 'active' };
      if (action === 'mark_rented') return { status: 'rented' };
      if (action === 'mark_stale') return { status: 'stale' };
      if (action === 'reject') return { status: 'invalid' };
      return null;
    default:
      return null;
  }
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return fail('Not authorised.', 401);

  const body = (await readJson(req)) as { entity?: string; id?: string; action?: Action };
  const table = body.entity ? MODERATED[body.entity] : undefined;
  if (!table || !body.id || !body.action) return fail('Unknown moderation request.', 400);

  if (body.action === 'delete') {
    const removed = await db().remove(table, body.id);
    return removed ? ok({ deleted: true }) : fail('Nothing to delete.', 404);
  }

  const patch = patchFor(table, body.action);
  if (!patch) return fail(`"${body.action}" does not apply to ${body.entity}.`, 400);

  const updated = await db().update(table, body.id, patch);
  if (!updated) return fail('Record not found.', 404);
  return ok({ updated: true });
}
