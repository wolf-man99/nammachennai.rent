import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { fieldErrors } from '@/lib/validation/schemas';
import { DataLayerNotConfiguredError } from '@/lib/db';

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(message: string, status = 400, errors?: Record<string, string>) {
  return NextResponse.json({ ok: false, message, errors: errors ?? {} }, { status });
}

export function fromZod(error: ZodError) {
  return fail('Please check the highlighted fields.', 422, fieldErrors(error));
}

export function tooMany(retryAfterSeconds: number) {
  return NextResponse.json(
    { ok: false, message: 'Too many requests. Try again shortly.', errors: {} },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
  );
}

/**
 * Wraps a route handler so an unexpected throw becomes a useful answer.
 *
 * A misconfigured deployment is the most common reason a form stops working, and
 * "Something went wrong" sends the operator hunting. This names the cause.
 */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof DataLayerNotConfiguredError) {
      console.error(err.message);
      return fail(err.userMessage, 503);
    }
    const message = err instanceof Error ? err.message : String(err);
    console.error('Unhandled route error:', message);

    // A storage-layer failure is worth naming - it is almost always credentials
    // or connectivity, not the submission itself.
    if (/supabase rest|database_url|postgres|fetch failed|econn/i.test(message)) {
      return fail(
        'We could not reach the database just now. Your details were not saved — please try again in a moment.',
        503,
      );
    }
    return fail('Something went wrong at our end. Please try again.', 500);
  }
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return {};
  }
}
