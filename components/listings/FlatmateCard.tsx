import type { PublicFlatmateListing } from '@/types';
import { LABELS } from '@/lib/constants';
import { formatRent, relativeTime } from '@/lib/format';
import { Pill } from '@/components/ui/primitives';
import { ContactOwner } from './ContactOwner';
import { ReportEntity } from './ReportEntity';

export function FlatmateCard({ listing }: { listing: PublicFlatmateListing }) {
  return (
    <article className="flex flex-col rounded-card border border-line bg-surface p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[1.375rem] font-semibold tabular-nums tracking-tight">
            {formatRent(listing.rent)}
            <span className="text-sm font-medium text-faint"> /mo</span>
          </p>
          <p className="mt-1 text-sm font-medium text-muted">
            {LABELS.roomType[listing.room_type]} · {listing.locality?.name ?? 'Chennai'}
          </p>
        </div>
        <Pill tone={listing.gender_preference === 'any' ? 'neutral' : 'data'}>
          {listing.gender_preference === 'any' ? 'Anyone' : LABELS.gender[listing.gender_preference]}
        </Pill>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        <Pill tone="neutral">In a {LABELS.bhk[listing.total_bhk]}</Pill>
        <Pill tone="neutral">{LABELS.furnishing[listing.furnishing]}</Pill>
        {listing.move_in_date ? (
          <Pill tone="neutral">
            From {new Date(listing.move_in_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </Pill>
        ) : null}
      </div>

      {listing.description ? (
        <p className="mt-4 line-clamp-4 text-sm leading-relaxed text-muted">{listing.description}</p>
      ) : null}

      <div className="mt-6">
        <ContactOwner
          endpoint={`/api/flatmates/${listing.id}/contact`}
          label="Get contact details"
          title="Reach out"
          blurb="Share your name and number and we will show you theirs. Nothing is published publicly."
        />
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-line pt-4 text-xs text-faint">
        <span>Posted {relativeTime(listing.created_at)}</span>
        <ReportEntity entityType="flatmate_listing" entityId={listing.id} />
      </div>
    </article>
  );
}
