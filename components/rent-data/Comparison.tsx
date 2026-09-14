import Link from 'next/link';
import type { LocalitySummary } from '@/services/rent-stats';
import { formatRentShort } from '@/lib/format';

/** Side-by-side medians. The bar is relative to the widest value in the set. */
export function Comparison({
  rows,
  highlightSlug,
}: {
  rows: { slug: string; name: string; median: number | null; reports: number }[];
  highlightSlug?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.median ?? 0));

  return (
    <ul className="space-y-3">
      {rows.map((r) => {
        const active = r.slug === highlightSlug;
        return (
          <li key={r.slug}>
            <Link
              href={`/chennai/${r.slug}`}
              className="group flex items-center gap-4 rounded-field px-2 py-2 transition-colors hover:bg-surface-sunk"
            >
              <span
                className={`w-32 shrink-0 truncate text-sm ${active ? 'font-semibold text-ink' : 'font-medium text-muted group-hover:text-ink'}`}
              >
                {r.name}
              </span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-ground">
                {r.median ? (
                  <span
                    className={`block h-full rounded-full ${active ? 'bg-data' : 'bg-data/35'}`}
                    style={{ width: `${(r.median / max) * 100}%` }}
                  />
                ) : null}
              </span>
              <span className="w-20 shrink-0 text-right text-sm font-semibold tabular-nums">
                {r.median ? formatRentShort(r.median) : <span className="text-faint">No data</span>}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function toComparisonRow(s: LocalitySummary) {
  return {
    slug: s.locality.slug,
    name: s.locality.name,
    median: s.twoBhk?.median ?? s.stats?.median ?? null,
    reports: s.reports,
  };
}
