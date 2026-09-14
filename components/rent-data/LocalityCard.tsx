import Link from 'next/link';
import type { LocalitySummary } from '@/services/rent-stats';
import { formatRentShort } from '@/lib/format';
import { BarSeries } from '@/components/charts';
import { TrendPill } from '@/components/ui/primitives';
import { MIN_SAMPLE } from '@/lib/constants';

/** A locality reduced to the three things a renter actually wants: level, spread, confidence. */
export function LocalityCard({ summary, rank }: { summary: LocalitySummary; rank?: number }) {
  const { locality, twoBhk, stats, reports, listings, trend } = summary;
  const headline = twoBhk ?? stats;
  const texture = headline
    ? [headline.min, headline.p25, headline.median, headline.p75, headline.max].map((v) => v - headline.min * 0.85)
    : [];

  return (
    <Link
      href={`/chennai/${locality.slug}`}
      className="group relative flex flex-col justify-between overflow-hidden rounded-card border border-line bg-surface p-5 transition-all duration-300 ease-[var(--ease-out-soft)] hover:-translate-y-1 hover:shadow-[0_18px_50px_rgb(20_20_20/0.09)]"
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            {rank !== undefined ? (
              <span className="eyebrow mb-2 block text-faint">{String(rank).padStart(2, '0')}</span>
            ) : null}
            <p className="text-lg font-semibold tracking-tight">{locality.name}</p>
            <p className="mt-0.5 text-xs text-faint">{locality.zone}</p>
          </div>
          {trend && headline ? <TrendPill pct={trend.pct} /> : null}
        </div>

        <div className="mt-6">
          {headline ? (
            <>
              <p className="text-[1.75rem] font-semibold leading-none tracking-tight tabular-nums">
                {formatRentShort(headline.median)}
              </p>
              <p className="mt-1.5 text-xs text-muted">
                Median {twoBhk ? '2 BHK' : 'rent'} · {reports} {reports === 1 ? 'report' : 'reports'}
              </p>
            </>
          ) : (
            <>
              <p className="text-base font-semibold leading-tight text-muted">Not enough renter data yet</p>
              <p className="mt-1.5 text-xs text-faint">
                {reports === 0
                  ? 'No reports here so far'
                  : `${reports} of ${MIN_SAMPLE} reports needed`}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="mt-6 flex items-end justify-between gap-4">
        {texture.length ? (
          <BarSeries values={texture} height={30} tone="data" className="w-24" animated={false} />
        ) : (
          <span className="h-[30px]" />
        )}
        <span className="text-xs font-medium text-faint">
          {listings > 0 ? `${listings} owner ${listings === 1 ? 'home' : 'homes'}` : '—'}
        </span>
      </div>
    </Link>
  );
}
