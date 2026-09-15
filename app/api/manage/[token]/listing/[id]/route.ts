import { fail, handle, ok, readJson, tooMany } from '@/lib/api';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import { applyOwnerAction, resolveOwnerByToken, type OwnerAction } from '@/services/owner';

export const runtime = 'nodejs';

const ACTIONS: OwnerAction[] = ['mark_rented', 'unpublish', 'republish'];

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string; id: string }> },
) {
  return handle(async () => {
    const { token, id } = await params;

    // The token is the only credential, so guessing must be expensive.
    const limit = rateLimit(clientKey(req, 'manage'), 30, 600_000);
    if (!limit.ok) return tooMany(limit.retryAfterSeconds);

    const owner = await resolveOwnerByToken(token);
    if (!owner) return fail('That dashboard link is not valid.', 404);

    const body = (await readJson(req)) as { action?: OwnerAction };
    if (!body.action || !ACTIONS.includes(body.action)) return fail('Unknown action.', 400);

    const applied = await applyOwnerAction(owner.phone, id, body.action);
    if (!applied) return fail('That listing is not on this number.', 403);

    return ok({ updated: true });
  });
}
