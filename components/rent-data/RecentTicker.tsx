import Link from 'next/link';
import type { Bhk } from '@/types';
import { LABELS } from '@/lib/constants';
import { formatRent, relativeTime } from '@/lib/format';

export interface TickerEntry {
  id: string;
  bhk: Bhk;
  rent: number;
  locality: string;
  slug: string;
  createdAt: string;
}

/**
 * The hero's proof panel: the last few rents renters actually reported. It is
 * the fastest way to show that the numbers on this site come from people.
 */
export function RecentTicker({ entries }: { entries: TickerEntry[] }) {
  return (
    <div className="rounded-card border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <p className="eyebrow text-white/40">Latest renter reports</p>
        <span className="flex items-center gap-1.5 text-[0.6875rem] font-medium text-owner">
          <span className="h-1.5 w-1.5 rounded-full bg-owner" />
          Live
        </span>
      </div>

      {entries.length ? (
        <ul className="mt-5 space-y-1">
          {entries.map((e) => (
            <li key={e.id}>
              <Link
                href={`/chennai/${e.slug}`}
                className="group flex items-center justify-between gap-4 rounded-field px-2 py-2.5 transition-colors hover:bg-white/5"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-white/90">{e.locality}</span>
                  <span className="mt-0.5 block text-xs text-white/40">
                    {LABELS.bhk[e.bhk]} · {relativeTime(e.createdAt)}
                  </span>
                </span>
                <span className="shrink-0 text-base font-semibold tabular-nums text-white transition-colors group-hover:text-owner">
                  {formatRent(e.rent)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-5 rounded-panel border border-dashed border-white/15 p-5">
          <p className="text-sm font-semibold text-white">No reports yet</p>
          <p className="mt-1.5 text-xs leading-relaxed text-white/45">
            This panel fills with real rents as renters share them. Nothing here is generated.
          </p>
          <Link href="/submit-rent" className="mt-4 inline-block text-xs font-semibold text-owner underline-offset-4 hover:underline">
            Be the first →
          </Link>
        </div>
      )}
    </div>
  );
}
