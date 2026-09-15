'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import type { OwnerListingSummary } from '@/types';
import { LABELS } from '@/lib/constants';
import { formatRent, relativeTime } from '@/lib/format';
import { Pill } from '@/components/ui/primitives';

const STATUS: Record<string, { label: string; tone: 'owner' | 'neutral' | 'warning' }> = {
  active: { label: 'Live', tone: 'owner' },
  rented: { label: 'Rented', tone: 'neutral' },
  hidden: { label: 'Hidden', tone: 'warning' },
  expired: { label: 'Expired', tone: 'warning' },
};

export function OwnerListingRow({ summary, token }: { summary: OwnerListingSummary; token: string }) {
  const { listing, views, enquiries } = summary;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const status = STATUS[listing.status] ?? STATUS.active;

  async function act(action: 'mark_rented' | 'unpublish' | 'republish') {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/manage/${token}/listing/${listing.id}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    const json = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
    setBusy(false);
    if (json?.ok) startTransition(() => router.refresh());
    else setError(json?.message ?? 'That did not work. Please try again.');
  }

  return (
    <article className="card overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-5 p-6 sm:p-7">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={status.tone}>{status.label}</Pill>
            <span className="text-xs text-faint">Listed {relativeTime(listing.created_at)}</span>
          </div>
          <p className="mt-3 text-[1.375rem] font-semibold tabular-nums tracking-tight">
            {formatRent(listing.rent)}
            <span className="text-sm font-medium text-faint"> /mo</span>
          </p>
          <p className="mt-1 text-sm font-medium text-muted">
            {LABELS.bhk[listing.bhk]} · {listing.locality?.name ?? 'Chennai'}
          </p>
          <Link
            href={`/property/${listing.id}`}
            className="mt-3 inline-block text-sm font-semibold underline-offset-4 hover:underline"
          >
            View the public page →
          </Link>
        </div>

        <div className="flex gap-8">
          <div>
            <p className="eyebrow mb-2 text-faint">Viewed by</p>
            <p className="text-stat font-semibold tabular-nums">{views}</p>
            <p className="mt-1 text-xs text-faint">{views === 1 ? 'person' : 'people'}</p>
          </div>
          <div>
            <p className="eyebrow mb-2 text-faint">Interested</p>
            <p className={`text-stat font-semibold tabular-nums ${enquiries.length ? 'text-data' : ''}`}>
              {enquiries.length}
            </p>
            <p className="mt-1 text-xs text-faint">asked for your number</p>
          </div>
        </div>
      </div>

      {enquiries.length ? (
        <div className="border-t border-line">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex w-full items-center justify-between px-6 py-4 text-left text-sm font-semibold transition-colors hover:bg-surface-sunk sm:px-7"
          >
            {open ? 'Hide' : 'Show'} the {enquiries.length}{' '}
            {enquiries.length === 1 ? 'person' : 'people'} who enquired
            <span className={`text-faint transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
          </button>

          {open ? (
            <ul className="divide-y divide-line border-t border-line">
              {enquiries.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 sm:px-7">
                  <div>
                    <p className="font-semibold tracking-tight">{e.name}</p>
                    <p className="mt-0.5 text-xs text-faint">{relativeTime(e.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:+91${e.phone}`}
                      className="rounded-pill border border-line-strong px-3.5 py-2 text-sm font-semibold tabular-nums transition-colors hover:border-ink"
                    >
                      {e.phone}
                    </a>
                    <a
                      href={`https://wa.me/91${e.phone}`}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="rounded-pill bg-ink px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-ink-soft"
                    >
                      WhatsApp
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <p className="border-t border-line px-6 py-4 text-sm text-muted sm:px-7">
          Nobody has asked for your number yet. Their name and number appear here when they do.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-line bg-surface-sunk px-6 py-4 sm:px-7">
        {listing.status === 'active' ? (
          <>
            <ActionButton disabled={busy || pending} onClick={() => act('mark_rented')}>
              Mark as rented
            </ActionButton>
            <ActionButton disabled={busy || pending} onClick={() => act('unpublish')}>
              Hide listing
            </ActionButton>
          </>
        ) : (
          <ActionButton disabled={busy || pending} onClick={() => act('republish')}>
            Publish again
          </ActionButton>
        )}
        {error ? <span className="text-xs font-medium text-error">{error}</span> : null}
      </div>
    </article>
  );
}

function ActionButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className="rounded-pill border border-line-strong bg-surface px-4 py-2 text-sm font-medium transition-colors hover:border-ink disabled:opacity-50"
    >
      {children}
    </button>
  );
}
