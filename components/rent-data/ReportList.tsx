import type { RentSubmission } from '@/types';
import { LABELS } from '@/lib/constants';
import { formatRent, relativeTime } from '@/lib/format';
import { EmptyState } from '@/components/ui/primitives';

/** Renter reports, stripped of anything that could identify who filed them. */
export function ReportList({ reports, limit = 8 }: { reports: RentSubmission[]; limit?: number }) {
  if (!reports.length) {
    return (
      <EmptyState
        title="No renter reports here yet"
        body="Reports appear the moment renters start sharing. Yours would be the first."
      />
    );
  }

  return (
    <ul className="divide-y divide-line">
      {reports.slice(0, limit).map((r) => (
        <li key={r.id} className="flex items-start justify-between gap-5 py-4">
          <div className="min-w-0">
            <p className="font-semibold tracking-tight">
              {LABELS.bhk[r.bhk]}
              <span className="ml-2 font-normal text-muted">{LABELS.furnishing[r.furnishing]}</span>
            </p>
            <p className="mt-1 text-xs text-faint">
              {LABELS.propertyType[r.property_type]}
              {r.floor !== null ? ` · Floor ${r.floor}` : ''}
              {r.maintenance ? ` · ${formatRent(r.maintenance)} maintenance` : ''}
            </p>
            {r.comments ? (
              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">“{r.comments}”</p>
            ) : null}
          </div>
          <div className="shrink-0 text-right">
            <p className="text-lg font-semibold tabular-nums">{formatRent(r.rent)}</p>
            <p className="mt-1 text-xs text-faint">{relativeTime(r.created_at)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
