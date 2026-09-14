import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { ok, fail, tooMany } from '@/lib/api';
import { clientKey, rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const MAX_BYTES = 5 * 1024 * 1024;

/** Extension is derived from the sniffed bytes, never from the client's filename. */
const SIGNATURES: { ext: string; type: string; test: (b: Uint8Array) => boolean }[] = [
  { ext: 'jpg', type: 'image/jpeg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    ext: 'png',
    type: 'image/png',
    test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  },
  {
    ext: 'webp',
    type: 'image/webp',
    test: (b) =>
      b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45,
  },
];

export async function POST(req: Request) {
  const limit = rateLimit(clientKey(req, 'upload'), 24, 3600_000);
  if (!limit.ok) return tooMany(limit.retryAfterSeconds);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail('Send the image as multipart form data.', 400);
  }

  const file = form.get('file');
  if (!(file instanceof File)) return fail('No image was attached.', 400);
  if (file.size > MAX_BYTES) return fail('Images must be under 5 MB.', 413);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const signature = SIGNATURES.find((s) => s.test(bytes));
  if (!signature) return fail('Only JPEG, PNG or WebP images are accepted.', 415);

  const name = `${randomUUID()}.${signature.ext}`;

  const supabaseUrl = process.env.SUPABASE_URL;
  // Supabase is migrating from service_role JWTs to sb_secret_... keys; accept
  // either name so a project on the new key system needs no code change.
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'photos';

  if (supabaseUrl && secretKey) {
    const res = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${name}`, {
      method: 'POST',
      headers: {
        // New-format keys are rejected without `apikey` alongside the bearer
        // token; legacy JWTs accept both, so sending both works either way.
        apikey: secretKey,
        authorization: `Bearer ${secretKey}`,
        'content-type': signature.type,
        'cache-control': 'public, max-age=31536000, immutable',
      },
      body: bytes,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error('Supabase storage upload failed', res.status, detail.slice(0, 300));
      return fail('Upload failed. Please try again.', 502);
    }
    return ok({ url: `${supabaseUrl}/storage/v1/object/public/${bucket}/${name}` }, { status: 201 });
  }

  // Local development fallback - a serverless filesystem is not writable, which is
  // exactly why Supabase Storage is the configured path in production.
  try {
    const dir = path.join(process.cwd(), 'public', 'uploads');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, name), bytes);
    return ok({ url: `/uploads/${name}` }, { status: 201 });
  } catch {
    return fail('Photo storage is not configured on this deployment.', 503);
  }
}
