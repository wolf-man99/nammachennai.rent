import Link from 'next/link';
import Image from 'next/image';
import type { PublicListing } from '@/types';
import { LABELS } from '@/lib/constants';
import { formatRent, formatRentShort, relativeTime } from '@/lib/format';
import { Pill } from '@/components/ui/primitives';
import { NoPhoto } from './NoPhoto';

/**
 * Editorial, not commercial: the rent leads, the locality anchors it, and the
 * no-photo state is a designed surface rather than a grey placeholder box.
 */
export function ListingCard({ listing, priority = false }: { listing: PublicListing; priority?: boolean }) {
  const photo = listing.photos[0];
  const bhkLabel = LABELS.bhk[listing.bhk];

  return (
    <Link
      href={`/property/${listing.id}`}
      className="group flex flex-col overflow-hidden rounded-card border border-line bg-surface transition-all duration-300 ease-[var(--ease-out-soft)] hover:-translate-y-1 hover:border-line-strong hover:shadow-[0_18px_50px_rgb(20_20_20/0.09)]"
    >
      <div className="relative aspect-[16/11] overflow-hidden bg-surface-sunk">
        {photo ? (
          <Image
            src={photo}
            alt={`${bhkLabel} in ${listing.locality?.name ?? 'Chennai'}`}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            priority={priority}
            className="object-cover transition-transform duration-500 ease-[var(--ease-out-soft)] group-hover:scale-[1.04]"
          />
        ) : (
          <NoPhoto bhk={bhkLabel} seed={listing.id} />
        )}

        <div className="absolute left-4 top-4 flex gap-2">
          <Pill tone="owner">Owner direct</Pill>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[1.375rem] font-semibold tracking-tight tabular-nums">
              {formatRent(listing.rent)}
              <span className="text-sm font-medium text-faint"> /mo</span>
            </p>
            <p className="mt-1 text-sm font-medium text-muted">
              {bhkLabel} · {listing.locality?.name ?? 'Chennai'}
            </p>
          </div>
          <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-ink transition-colors duration-200 group-hover:border-ink group-hover:bg-ink group-hover:text-white">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          <Pill tone="neutral">{LABELS.furnishing[listing.furnishing]}</Pill>
          {listing.deposit ? <Pill tone="neutral">{formatRentShort(listing.deposit)} deposit</Pill> : null}
          {listing.area_sqft ? <Pill tone="neutral">{listing.area_sqft} sq ft</Pill> : null}
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-line pt-4 text-xs text-faint">
          <span>
            {listing.available_from
              ? `Available ${new Date(listing.available_from).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
              : 'Available now'}
          </span>
          <span>{relativeTime(listing.created_at)}</span>
        </div>
      </div>
    </Link>
  );
}

export function ListingGrid({ listings }: { listings: PublicListing[] }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {listings.map((l, i) => (
        <ListingCard key={l.id} listing={l} priority={i < 3} />
      ))}
    </div>
  );
}
