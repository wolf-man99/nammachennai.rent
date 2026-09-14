import type { Metadata } from 'next';
import Link from 'next/link';
import { Container, Eyebrow, SectionHeader, EmptyState } from '@/components/ui/primitives';
import { LocalityCard } from '@/components/rent-data/LocalityCard';
import { Comparison, toComparisonRow } from '@/components/rent-data/Comparison';
import { LocalitySearch } from '@/components/navigation/LocalitySearch';
import { getLocalities, getZones } from '@/services/localities';
import { getCityIndex, getLocalitySummaries } from '@/services/rent-stats';
import { parseSearch } from '@/lib/search-query';
import { formatRent } from '@/lib/format';

export const revalidate = 600;

export const metadata: Metadata = {
  title: 'Compare Chennai localities by rent',
  description:
    'Compare median rent, spread and trend across every Chennai locality on Chennai.rent — built from renter-reported data.',
  alternates: { canonical: '/explore' },
};

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q) ?? '';
  const parsed = parseSearch(q);

  const [localities, summaries, index] = await Promise.all([
    getLocalities(),
    getLocalitySummaries(),
    getCityIndex(),
  ]);

  const query = parsed.text.toLowerCase();
  const filtered = query
    ? summaries.filter(
        (s) =>
          s.locality.name.toLowerCase().includes(query) ||
          (s.locality.zone ?? '').toLowerCase().includes(query),
      )
    : summaries;

  const withData = [...filtered].filter((s) => s.stats).sort((a, b) => b.reports - a.reports);
  const withoutData = filtered.filter((s) => !s.stats);
  const zones = getZones();

  return (
    <Container className="pt-8 lg:pt-14">
      <Eyebrow>Locality intelligence</Eyebrow>
      <h1 className="mt-4 max-w-2xl text-headline font-semibold uppercase tracking-tight">
        Compare Chennai locality by locality
      </h1>
      <p className="mt-4 max-w-xl text-[0.9375rem] text-muted">
        {index.medianTwoBhk
          ? `The city-wide 2 BHK median is ${formatRent(index.medianTwoBhk.median)} from ${index.totalReports} renter reports.`
          : 'Medians appear here as renters report what they pay. Nothing on this page is estimated.'}
      </p>

      <div className="mt-8 max-w-2xl">
        <LocalitySearch localities={localities} />
      </div>

      {q ? (
        <p className="mt-5 text-sm text-muted">
          Showing {filtered.length} {filtered.length === 1 ? 'locality' : 'localities'} for{' '}
          <strong className="text-ink">{q}</strong>.{' '}
          <Link href="/explore" className="font-semibold underline-offset-4 hover:underline">
            Clear
          </Link>
        </p>
      ) : null}

      <div className="mt-10 flex flex-wrap gap-2">
        {zones.map((z) => (
          <Link
            key={z.slug}
            href={`/chennai/${z.slug}`}
            className="rounded-pill border border-line-strong bg-surface px-4 py-2 text-sm font-medium transition-colors hover:border-ink"
          >
            {z.name}
          </Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title="No Chennai locality matches that"
            body="We are Chennai-only for now. Try a nearby area, or add your rent so your locality appears."
          />
        </div>
      ) : null}

      {withData.length ? (
        <section className="mt-12">
          <SectionHeader eyebrow="With renter data" title="Localities you can compare" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {withData.map((s) => (
              <LocalityCard key={s.locality.id} summary={s} />
            ))}
          </div>

          <div className="mt-10 card p-7 sm:p-9">
            <SectionHeader eyebrow="Side by side" title="Median rent compared" />
            <Comparison rows={withData.map(toComparisonRow)} />
          </div>
        </section>
      ) : null}

      {withoutData.length ? (
        <section className="mt-14">
          <SectionHeader
            eyebrow="Waiting on data"
            title="Localities that need reports"
          >
            <p className="mt-3 max-w-xl text-sm text-muted">
              We will not publish a median until enough renters have reported. If you live in one of
              these, yours would make the difference.
            </p>
          </SectionHeader>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {withoutData.map((s) => (
              <LocalityCard key={s.locality.id} summary={s} />
            ))}
          </div>
        </section>
      ) : null}
    </Container>
  );
}
