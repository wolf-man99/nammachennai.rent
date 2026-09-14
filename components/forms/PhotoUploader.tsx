'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';

const MAX = 8;

export function PhotoUploader({
  value,
  onChange,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(files: FileList) {
    setError(null);
    setBusy(true);
    const urls: string[] = [];
    for (const file of Array.from(files).slice(0, MAX - value.length)) {
      const body = new FormData();
      body.append('file', file);
      try {
        const res = await fetch('/api/upload', { method: 'POST', body });
        const json = (await res.json()) as { ok: boolean; data?: { url: string }; message?: string };
        if (json.ok && json.data) urls.push(json.data.url);
        else setError(json.message ?? 'That image could not be uploaded.');
      } catch {
        setError('Upload failed. Check your connection.');
      }
    }
    onChange([...value, ...urls].slice(0, MAX));
    setBusy(false);
    if (input.current) input.current.value = '';
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {value.map((url, i) => (
          <div key={url} className="group relative aspect-square overflow-hidden rounded-field border border-line">
            <Image src={url} alt={`Photo ${i + 1}`} fill sizes="120px" className="object-cover" />
            <button
              type="button"
              onClick={() => onChange(value.filter((u) => u !== url))}
              className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-ink/80 text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
              aria-label={`Remove photo ${i + 1}`}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
            {i === 0 ? (
              <span className="absolute bottom-1.5 left-1.5 rounded-pill bg-owner px-2 py-0.5 text-[0.625rem] font-semibold text-ink">
                Cover
              </span>
            ) : null}
          </div>
        ))}

        {value.length < MAX ? (
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={busy}
            className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-field border border-dashed border-line-strong text-xs font-medium text-muted transition-colors hover:border-ink hover:text-ink disabled:opacity-60"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 6v12M6 12h12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
            {busy ? 'Uploading…' : 'Add photo'}
          </button>
        ) : null}
      </div>

      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        onChange={(e) => e.target.files && upload(e.target.files)}
      />

      <p className="mt-3 text-xs text-faint">
        Up to {MAX} photos, JPEG/PNG/WebP under 5 MB. Homes with photos get far more enquiries.
      </p>
      {error ? <p className="mt-2 text-xs font-medium text-error">{error}</p> : null}
    </div>
  );
}
