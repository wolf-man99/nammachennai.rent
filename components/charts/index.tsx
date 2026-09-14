import type { TrendPoint } from '@/types';
import { formatRentShort } from '@/lib/format';

/**
 * Charts are plain SVG and plain divs - no charting library, no client JS.
 * They render on the server, so a locality page paints its data immediately.
 */

/* ------------------------------------------------------------------ */
/* Bar series - the product's signature data texture                   */
/* ------------------------------------------------------------------ */

export function BarSeries({
  values,
  height = 72,
  tone = 'ink',
  className = '',
  animated = true,
}: {
  values: number[];
  height?: number;
  tone?: 'ink' | 'data' | 'owner' | 'tolet' | 'light';
  className?: string;
  animated?: boolean;
}) {
  if (!values.length) return null;
  const max = Math.max(...values, 1);
  const colors: Record<string, string> = {
    ink: 'bg-ink/25',
    data: 'bg-data/35',
    owner: 'bg-owner-ink/30',
    tolet: 'bg-tolet/30',
    light: 'bg-white/25',
  };
  return (
    <div
      className={`flex items-end gap-[3px] ${className}`}
      style={{ height }}
      aria-hidden="true"
    >
      {values.map((v, i) => (
        <div
          key={i}
          className={`min-w-[2px] flex-1 rounded-full ${colors[tone]} ${animated ? 'animate-grow' : ''}`}
          style={{
            height: `${Math.max(6, (v / max) * 100)}%`,
            animationDelay: animated ? `${i * 14}ms` : undefined,
          }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Trend line - gaps where the sample is too thin to publish           */
/* ------------------------------------------------------------------ */

export function TrendLine({
  points,
  height = 190,
  accent = 'var(--color-data)',
  showAxis = true,
}: {
  points: TrendPoint[];
  height?: number;
  accent?: string;
  showAxis?: boolean;
}) {
  const W = 620;
  const H = height;
  const padX = 8;
  const padY = 26;
  const valued = points.filter((p) => p.value !== null) as { label: string; value: number; sample: number }[];

  if (valued.length < 2) {
    return (
      <div
        className="flex items-center justify-center rounded-panel border border-dashed border-line-strong text-sm text-muted"
        style={{ height }}
      >
        Not enough renter data yet for a trend
      </div>
    );
  }

  const min = Math.min(...valued.map((p) => p.value));
  const max = Math.max(...valued.map((p) => p.value));
  const span = Math.max(1, max - min);

  const x = (i: number) => padX + (i / Math.max(1, points.length - 1)) * (W - padX * 2);
  const y = (v: number) => padY + (1 - (v - min) / span) * (H - padY * 2);

  // Break the path wherever a month has no publishable median.
  const segments: string[] = [];
  let current: string[] = [];
  points.forEach((p, i) => {
    if (p.value === null) {
      if (current.length > 1) segments.push(current.join(' '));
      current = [];
      return;
    }
    current.push(`${current.length ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`);
  });
  if (current.length > 1) segments.push(current.join(' '));

  const areaPath = segments.length
    ? `${segments[0]} L${x(points.findLastIndex((p) => p.value !== null)).toFixed(1)} ${H - padY} L${x(
        points.findIndex((p) => p.value !== null),
      ).toFixed(1)} ${H - padY} Z`
    : '';

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Median rent trend">
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.16" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0, 0.5, 1].map((t) => (
          <line
            key={t}
            x1={padX}
            x2={W - padX}
            y1={padY + t * (H - padY * 2)}
            y2={padY + t * (H - padY * 2)}
            stroke="var(--color-line)"
            strokeWidth="1"
            strokeDasharray={t === 0.5 ? '3 5' : undefined}
          />
        ))}

        {areaPath ? <path d={areaPath} fill="url(#trendFill)" /> : null}

        {segments.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke={accent}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="animate-draw"
            style={{ ['--dash' as string]: '1600' }}
          />
        ))}

        {points.map((p, i) =>
          p.value === null ? null : (
            <circle key={i} cx={x(i)} cy={y(p.value)} r="4" fill="var(--color-surface)" stroke={accent} strokeWidth="2.5" />
          ),
        )}
      </svg>

      {showAxis ? (
        <div className="mt-3 flex justify-between px-2 text-[0.6875rem] font-medium text-faint">
          {points.map((p, i) => (
            <span key={i} className={p.value === null ? 'opacity-40' : ''}>
              {p.label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Distribution                                                        */
/* ------------------------------------------------------------------ */

export function DistributionChart({
  bins,
  median,
}: {
  bins: { from: number; to: number; count: number }[];
  median?: number | null;
}) {
  if (!bins.length) return null;
  const max = Math.max(...bins.map((b) => b.count), 1);
  return (
    <div>
      <div className="flex h-44 items-end gap-2">
        {bins.map((b, i) => {
          const isMedianBin = median !== null && median !== undefined && median >= b.from && median < b.to;
          return (
            <div key={i} className="group relative flex h-full flex-1 flex-col items-center justify-end gap-2">
              <span className="text-[0.6875rem] font-semibold tabular-nums text-faint opacity-0 transition-opacity group-hover:opacity-100">
                {b.count}
              </span>
              <div
                className={`w-full rounded-t-lg transition-colors duration-200 animate-grow ${
                  isMedianBin ? 'bg-data' : 'bg-data/20 group-hover:bg-data/40'
                }`}
                style={{
                  height: `${Math.max(4, (b.count / max) * 100)}%`,
                  animationDelay: `${i * 40}ms`,
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex justify-between text-[0.6875rem] font-medium text-faint">
        <span>{formatRentShort(bins[0].from)}</span>
        <span>{formatRentShort(bins[bins.length - 1].to)}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Range bar - where a single rent sits inside the local band          */
/* ------------------------------------------------------------------ */

export function RangeBar({
  min,
  max,
  p25,
  p75,
  median,
  marker,
  markerLabel,
}: {
  min: number;
  max: number;
  p25: number;
  p75: number;
  median: number;
  marker?: number | null;
  markerLabel?: string;
}) {
  const span = Math.max(1, max - min);
  const pos = (v: number) => `${Math.min(100, Math.max(0, ((v - min) / span) * 100))}%`;

  return (
    <div className="pt-8">
      <div className="relative h-2.5 w-full rounded-full bg-ground">
        <div
          className="absolute inset-y-0 rounded-full bg-data/25"
          style={{ left: pos(p25), right: `${100 - parseFloat(pos(p75))}%` }}
        />
        <div
          className="absolute -top-1 h-4.5 w-[3px] rounded-full bg-data"
          style={{ left: pos(median), height: '18px', top: '-4px' }}
          aria-label="Median"
        />
        {marker !== null && marker !== undefined ? (
          <div className="absolute -top-8" style={{ left: pos(marker), transform: 'translateX(-50%)' }}>
            <span className="whitespace-nowrap rounded-pill bg-ink px-2.5 py-1 text-[0.6875rem] font-semibold text-white">
              {markerLabel ?? formatRentShort(marker)}
            </span>
            <div className="mx-auto h-3 w-[2px] bg-ink" />
          </div>
        ) : null}
      </div>
      <div className="mt-3 flex justify-between text-xs font-medium text-faint tabular-nums">
        <span>{formatRentShort(min)}</span>
        <span className="text-data">{formatRentShort(median)} median</span>
        <span>{formatRentShort(max)}</span>
      </div>
    </div>
  );
}
