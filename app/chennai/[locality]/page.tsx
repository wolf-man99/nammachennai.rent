import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Container,
  Eyebrow,
  EmptyState,
  SectionHeader,
  Stat,
  TrendPill,
  ButtonLink,
  Pill,
} from '@/components/ui/primitives';
import { DistributionChart, TrendLine } from '@/components/charts';
import { ReportList } from '@/components/rent-data/ReportList';
import { Comparison, toComparisonRow } from '@/components/rent-data/Comparison';
import { ListingGrid } from '@/components/listings/ListingCard';
import { prerenderAreaSlugs, nearbyLocalities, resolveArea } from '@/services/localities';
import {
  distribution,
  getAreaStats,
  getLocalitySummaries,
  getSubmissions,
  getTrendSeries,
} from '@/services/rent-stats';
import { getListings } from '@/services/listings';
import { getToletReports } from '@/services/tolet';
import { BHK_OPTIONS, BHK_SLUGS, CITY_LABEL, MIN_SAMPLE, SITE_URL } from '@/lib/constants';
import { formatRent, formatRentShort } from '@/lib/format';

export const revalidate = 600;

export async function generateStaticParams() {
  const slugs = await prerenderAreaSlugs();
  return slugs.map((s) => ({ locality: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locality: string }>;
}): Promise<Metadata> {
  const { locality } = await params;
  const area = await resolveArea(locality);
  if (!area) return { title: 'Locality not found' };

  const stats = await getAreaStats(area.localities);
  const median = stats.byBhk['2BHK']?.median ?? stats.overall?.median ?? null;

  return {
    title: `Rent in ${area.name}, ${CITY_LABEL} — prices & owner-direct homes`,
    description: median
      ? `Median rent in ${area.name} is ${formatRent(median)} based on ${stats.reportCount} renter reports. Compare localities and find owner-direct homes.`
      : `Rent data for ${area.name}, ${CITY_LABEL}. See renter reports, owner-direct homes and how ${area.name} compares with nearby localities.`,
    alternates: { canonical: `/chennai/${area.slug}` },
    openGraph: {
      title: `Rent in ${area.name}, ${CITY_LABEL}`,
      description: median
        ? `Median ${formatRent(median)} from ${stats.reportCount} renter reports.`
        : `Renter-reported rent data for ${area.name}.`,
    },
  };
}

export default async function LocalityPage({ params }: { params: Promise<{ locality: string }> }) {
  const { locality: slug } = await params;
  const area = await resolveArea(slug);
  if (!area) notFound();

  const localityIds = area.localities.map((l) => l.id);

  const [stats, submissions, trend, listings, tolets, nearby, allSummaries] = await Promise.all([
    getAreaStats(area.localities),
    getSubmissions({ localityIds }),
    getTrendSeries(localityIds, null, 6),
    getListings({ localityIds, limit: 6 }),
    getToletReports({ localityIds, limit: 1 }),
    nearbyLocalities(area, 5),
    getLocalitySummaries(),
  ]);

  const headline = stats.byBhk['2BHK'] ?? stats.overall;
  const headlineLabel = stats.byBhk['2BHK'] ? 'Median 2 BHK rent' : 'Median rent';
  const bins = distribution(submissions.map((s) => s.rent));

  const comparisonRows = [
    ...(area.kind === 'locality'
      ? allSummaries.filter((s) => s.locality.slug === area.slug).map(toComparisonRow)
      : []),
    ...nearby.map((n) => {
      const summary = allSummaries.find((s) => s.locality.id === n.id);
      return summary
        ? toComparisonRow(summary)
        : { slug: n.slug, name: n.name, median: null, reports: 0 };
    }),
  ];

  const bhkRows = BHK_OPTIONS.map((o) => ({ ...o, stats: stats.byBhk[o.value] ?? null })).filter(
    (r) => r.stats || r.value === '2BHK',
  );

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: `${area.name}, ${CITY_LABEL}`,
    address: { '@type': 'PostalAddress', addressLocality: area.name, addressRegion: 'Tamil Nadu', addressCountry: 'IN' },
    geo: { '@type': 'GeoCoordinates', latitude: area.latitude, longitude: area.longitude },
    url: `${SITE_URL}/chennai/${area.slug}`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ----------------------------------------------------- Hero */}
      <section className="px-3 pt-3 sm:px-5 lg:px-8 lg:pt-4">
        <div className="relative overflow-hidden rounded-[32px] bg-ink px-6 pb-32 pt-12 text-white sm:px-10 sm:pb-36 sm:pt-16 lg:px-16">
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-32 h-[420px] w-[420px] rounded-full bg-data/22 blur-[130px]" />

          <div className="relative">
            <nav className="mb-8 flex items-center gap-2 text-xs text-white/40" aria-label="Breadcrumb">
              <Link href="/" className="tap inline-block transition-colors hover:text-white">Rent In Chennai</Link>
              <span>/</span>
              <Link href="/explore" className="tap inline-block transition-colors hover:text-white">Localities</Link>
              <span>/</span>
              <span className="text-white/70">{area.name}</span>
            </nav>

            <Eyebrow className="text-owner">{area.kind === 'zone' ? 'Chennai corridor' : CITY_LABEL}</Eyebrow>
            <h1 className="mt-5 text-[clamp(1.75rem,8.5vw,5.75rem)] leading-[0.94] tracking-[-0.04em] break-words font-semibold uppercase">{area.name}</h1>

            {area.blurb ? <p className="mt-5 max-w-lg text-[0.9375rem] text-white/55">{area.blurb}</p> : null}

            <div className="mt-10 flex flex-wrap items-end gap-x-14 gap-y-8">
              {headline ? (
                <div>
                  <p className="text-display font-semibold tabular-nums leading-none">
                    {formatRent(headline.median)}
                  </p>
                  <p className="mt-4 flex items-center gap-3 text-sm text-white/55">
                    {headlineLabel}
                    {stats.trend ? <TrendPill pct={stats.trend.pct} dark /> : null}
                  </p>
                </div>
              ) : (
                <div className="max-w-md">
                  <p className="text-headline font-semibold leading-[1.05]">Not enough renter data yet</p>
                  <p className="mt-4 text-sm text-white/55">
                    {area.name} needs {Math.max(0, MIN_SAMPLE - stats.reportCount)} more{' '}
                    {MIN_SAMPLE - stats.reportCount === 1 ? 'report' : 'reports'} before we publish a
                    median. We would rather show nothing than guess.
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-x-12 gap-y-6">
                <Stat label="Renter reports" value={stats.reportCount.toLocaleString('en-IN')} tone="light" />
                <Stat label="Owner-direct homes" value={stats.listingCount.toLocaleString('en-IN')} tone="light" />
                <Stat label="To-Let boards" value={stats.toletCount.toLocaleString('en-IN')} tone="light" />
              </div>
            </div>

            <div className="mt-10 flex flex-wrap gap-3">
              <ButtonLink href="/submit-rent" variant="accent">Submit your rent</ButtonLink>
              <ButtonLink href={`/map`} variant="light">See on map</ButtonLink>
              {area.kind === 'zone' ? null : (
                <ButtonLink href={`/chennai/${area.slug}/${BHK_SLUGS['2BHK']}`} variant="light">
                  2 BHK detail
                </ButtonLink>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------- Range + trend */}
      <Container className="relative z-10 -mt-24">
        <div className="grid gap-5 lg:grid-cols-[1fr_1.25fr]">
          <div className="card p-7 sm:p-9">
            <Eyebrow>Rent range</Eyebrow>
            {headline ? (
              <>
                <p className="mt-6 text-stat font-semibold tabular-nums">
                  {formatRentShort(headline.p25)} — {formatRentShort(headline.p75)}
                </p>
                <p className="mt-3 text-sm text-muted">
                  Half of reported rents sit in this band. The full spread runs{' '}
                  {formatRentShort(headline.min)} to {formatRentShort(headline.max)}.
                </p>
                <div className="mt-8 border-t border-line pt-7">
                  <Eyebrow className="mb-5">Rent distribution</Eyebrow>
                  {bins.length ? (
                    <DistributionChart bins={bins} median={headline.median} />
                  ) : (
                    <p className="text-sm text-muted">Not enough reports to plot a distribution yet.</p>
                  )}
                </div>
              </>
            ) : (
              <div className="mt-6">
                <EmptyState />
              </div>
            )}
          </div>

          <div className="card p-7 sm:p-9">
            <div className="flex items-start justify-between gap-4">
              <Eyebrow>Rent trend · last 6 months</Eyebrow>
              {stats.trend ? <TrendPill pct={stats.trend.pct} /> : null}
            </div>
            <div className="mt-8">
              <TrendLine points={trend} />
            </div>

            <div className="mt-8 border-t border-line pt-7">
              <Eyebrow className="mb-5">By size</Eyebrow>
              <ul className="divide-y divide-line">
                {bhkRows.map((row) => (
                  <li key={row.value}>
                    <Link
                      href={`/chennai/${area.slug}/${BHK_SLUGS[row.value]}`}
                      className="group flex items-center justify-between py-3"
                    >
                      <span className="font-medium transition-colors group-hover:text-data">{row.label}</span>
                      {row.stats ? (
                        <span className="flex items-baseline gap-3">
                          <span className="text-xs text-faint">{row.stats.sample} reports</span>
                          <span className="text-lg font-semibold tabular-nums">
                            {formatRentShort(row.stats.median)}
                          </span>
                        </span>
                      ) : (
                        <span className="text-xs text-faint">Not enough data</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Container>

      {/* ------------------------------------------- Reports + compare */}
      <Container className="mt-16">
        <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
          <section className="card p-7 sm:p-9">
            <SectionHeader eyebrow="From renters" title={`Recent reports in ${area.name}`} />
            <ReportList reports={submissions} />
          </section>

          <section className="card p-7 sm:p-9">
            <SectionHeader eyebrow="Compare" title="Nearby localities" href="/explore" hrefLabel="Compare all" />
            <Comparison rows={comparisonRows} highlightSlug={area.slug} />
            {tolets.length ? (
              <div className="mt-8 border-t border-line pt-6">
                <Pill tone="tolet">{stats.toletCount} To-Let boards reported nearby</Pill>
                <Link href="/to-let" className="tap mt-4 inline-block py-1.5 text-sm font-semibold underline-offset-4 hover:underline">
                  Browse To-Let boards →
                </Link>
              </div>
            ) : null}

            <div className="mt-8 rounded-panel bg-ink p-6 text-white">
              <p className="eyebrow text-owner">Missing from this list?</p>
              <p className="mt-4 text-base font-semibold leading-snug">
                A locality shows a median once {MIN_SAMPLE} renters have reported. Yours might be the
                one that unlocks it.
              </p>
              <ButtonLink href="/submit-rent" variant="accent" size="sm" className="mt-5">
                Submit Your Rent
              </ButtonLink>
            </div>
          </section>
        </div>
      </Container>

      {/* --------------------------------------------- Available homes */}
      <Container className="mt-16">
        <SectionHeader
          eyebrow="Zero brokerage"
          title={`Owner-direct homes in ${area.name}`}
          href="/listings"
          hrefLabel="All homes"
        />
        {listings.length ? (
          <ListingGrid listings={listings} />
        ) : (
          <EmptyState
            title={`No owner listings in ${area.name} yet`}
            body="Own a home here? Listing it takes two minutes, costs nothing, and renters see it immediately."
            cta={{ href: '/list-property', label: 'List Your Property' }}
          />
        )}
      </Container>

      {/* ------------------------------------------------ Member areas */}
      {area.kind === 'zone' ? (
        <Container className="mt-16">
          <SectionHeader eyebrow="Inside this corridor" title={`Localities in ${area.name}`} />
          <div className="flex flex-wrap gap-2.5">
            {area.localities.map((l) => (
              <Link
                key={l.id}
                href={`/chennai/${l.slug}`}
                className="rounded-pill border border-line-strong bg-surface px-4 py-2.5 text-sm font-medium transition-colors hover:border-ink"
              >
                {l.name}
              </Link>
            ))}
          </div>
        </Container>
      ) : null}
    </>
  );
}
