import type { CityIndex } from '@/services/rent-stats';
import type { TrendPoint } from '@/types';
import { formatRent } from '@/lib/format';
import { TrendLine } from '@/components/charts';
import { Eyebrow, TrendPill } from '@/components/ui/primitives';
import { MIN_SAMPLE } from '@/lib/constants';

/**
 * The homepage's centre of gravity. Every figure here is computed; when the
 * sample is thin the card says so rather than printing a plausible number.
 */
export function CityIndexPanel({ index, trend }: { index: CityIndex; trend: TrendPoint[] }) {
  const hasMedian = Boolean(index.medianTwoBhk);

  return (
    <div className="grid overflow-hidden rounded-card border border-line bg-surface lg:grid-cols-[1.05fr_1fr]">
      <div className="border-b border-line p-7 sm:p-9 lg:border-b-0 lg:border-r">
        <div className="flex items-start justify-between gap-4">
          <Eyebrow>Chennai rent index</Eyebrow>
          {index.trend ? <TrendPill pct={index.trend.pct} /> : null}
        </div>

        {hasMedian ? (
          <>
            <p className="mt-6 text-display font-semibold tabular-nums">
              {formatRent(index.medianTwoBhk!.median)}
            </p>
            <p className="mt-3 text-[0.9375rem] text-muted">
              Median 2 BHK rent across Chennai, from {index.medianTwoBhk!.sample} renter{' '}
              {index.medianTwoBhk!.sample === 1 ? 'report' : 'reports'}.
            </p>
          </>
        ) : (
          <>
            <p className="mt-6 max-w-sm text-headline font-semibold leading-[1.05] tracking-tight text-ink/85">
              Not enough renter data yet
            </p>
            <p className="mt-4 max-w-sm text-[0.9375rem] text-muted">
              A city median needs at least {MIN_SAMPLE} reports for a 2 BHK. So far there{' '}
              {index.totalReports === 1 ? 'is' : 'are'} {index.totalReports}{' '}
              {index.totalReports === 1 ? 'report' : 'reports'} in total — be one of the first to share yours.
            </p>
          </>
        )}

        <dl className="mt-10 grid grid-cols-3 gap-5 border-t border-line pt-7">
          <Metric label="Rent reports" value={index.totalReports.toLocaleString('en-IN')} />
          <Metric label="Active localities" value={index.activeLocalities.toLocaleString('en-IN')} />
          <Metric label="Owner homes" value={index.activeListings.toLocaleString('en-IN')} />
        </dl>
      </div>

      <div className="p-7 sm:p-9">
        <div className="flex items-start justify-between gap-4">
          <Eyebrow>2 BHK median · last 6 months</Eyebrow>
        </div>
        <div className="mt-8">
          <TrendLine points={trend} />
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="eyebrow mb-2 text-faint">{label}</dt>
      <dd className="text-xl font-semibold tabular-nums sm:text-2xl">{value}</dd>
    </div>
  );
}
