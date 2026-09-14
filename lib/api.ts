import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { fieldErrors } from '@/lib/validation/schemas';

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

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return {};
  }
}
