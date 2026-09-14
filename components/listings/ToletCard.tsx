import Image from 'next/image';
import Link from 'next/link';
import type { PublicToletReport } from '@/types';
import { LABELS } from '@/lib/constants';
import { formatRent, relativeTime } from '@/lib/format';
import { Pill } from '@/components/ui/primitives';
import { ContactOwner } from './ContactOwner';
import { ReportEntity } from './ReportEntity';
import { isStale } from '@/services/tolet';

/** A board someone walked past. Treated as a lead, never as verified inventory. */
export function ToletCard({ report }: { report: PublicToletReport }) {
  const stale = isStale(report);
  const days = Math.max(0, Math.floor((Date.now() - new Date(report.seen_at).getTime()) / 86_400_000));

  return (
    <article className="flex flex-col overflow-hidden rounded-card border border-line bg-surface">
      <div className="relative aspect-[4/3] bg-surface-sunk">
        {report.photo ? (
          <Image
            src={report.photo}
            alt={`To-Let board in ${report.locality?.name ?? 'Chennai'}`}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-2xl font-semibold uppercase tracking-tight text-ink/12">To-Let</span>
          </div>
        )}
        <div className="absolute left-4 top-4">
          <Pill tone={stale ? 'warning' : 'tolet'}>
            {days === 0 ? 'Seen today' : `Reported ${days} ${days === 1 ? 'day' : 'days'} ago`}
          </Pill>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="text-[1.375rem] font-semibold tabular-nums tracking-tight">
          {report.rent ? formatRent(report.rent) : 'Rent not on board'}
        </p>
        <p className="mt-1 text-sm font-medium text-muted">
          {report.bhk ? `${LABELS.bhk[report.bhk]} · ` : ''}
          {report.locality?.name ?? 'Chennai'}
        </p>
        {report.landmark ? <p className="mt-2 text-sm text-muted">{report.landmark}</p> : null}

        {stale ? (
          <p className="mt-4 rounded-field bg-warning-soft px-3.5 py-2.5 text-xs leading-relaxed text-warning">
            This board was seen over a month ago and may already be rented. Flag it if you know.
          </p>
        ) : null}

        <div className="mt-5 flex-1">
          {report.has_phone ? (
            <ContactOwner
              endpoint={`/api/tolet/${report.id}/contact`}
              label="Show the number"
              title="Number from the board"
              blurb="Someone photographed this board. Share your name and number and we will show you the one printed on it."
            />
          ) : (
            <p className="rounded-field bg-surface-sunk px-3.5 py-3 text-xs text-muted">
              No phone number was recorded from this board.
            </p>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-line pt-4 text-xs text-faint">
          {report.locality ? (
            <Link href={`/chennai/${report.locality.slug}`} className="tap inline-block hover:text-ink">
              {report.locality.name} rent data
            </Link>
          ) : (
            <span>{relativeTime(report.created_at)}</span>
          )}
          <ReportEntity entityType="tolet_report" entityId={report.id} />
        </div>
      </div>
    </article>
  );
}
