import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ButtonLink,
  Container,
  EmptyState,
  Eyebrow,
  SectionHeader,
  Stat,
  TrendPill,
} from '@/components/ui/primitives';
import { DistributionChart, TrendLine } from '@/components/charts';
import { ReportList } from '@/components/rent-data/ReportList';
import { ListingGrid } from '@/components/listings/ListingCard';
import { allAreaSlugs, resolveArea } from '@/services/localities';
import { distribution, getAreaStats, getBhkStats, getTrendSeries } from '@/services/rent-stats';
import { getListings } from '@/services/listings';
import {
  BHK_OPTIONS,
  BHK_SLUGS,
  CITY_LABEL,
  LABELS,
  MIN_SAMPLE,
  MIN_SAMPLE_INDEXABLE,
  SITE_URL,
  SLUG_TO_BHK,
} from '@/lib/constants';
import { formatRent, formatRentShort } from '@/lib/format';

export const revalidate = 600;

/**
 * Only the sizes that plausibly carry data get pre-rendered. Everything else is
 * still reachable, just rendered on demand and left out of the sitemap.
 */
export async function generateStaticParams() {
  const slugs = await allAreaSlugs();
  return slugs.flatMap((s) =>
    (['1BHK', '2BHK', '3BHK'] as const).map((b) => ({ locality: s.slug, bhk: BHK_SLUGS[b] })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locality: string; bhk: string }>;
}): Promise<Metadata> {
  const { locality, bhk: bhkSlug } = await params;
  const bhk = SLUG_TO_BHK[bhkSlug];
  const area = await resolveArea(locality);
  if (!area || !bhk) return { title: 'Page not found' };

  const { stats } = await getBhkStats(area.localities, bhk);
  const label = LABELS.bhk[bhk];
  const indexable = Boolean(stats && stats.sample >= MIN_SAMPLE_INDEXABLE);

  return {
    title: `${label} Rent in ${area.name}, ${CITY_LABEL} | Rent In Chennai`,
    description: stats
      ? `Median ${label} rent in ${area.name} is ${formatRent(stats.median)}, from ${stats.sample} renter reports. See the full range and owner-direct homes.`
      : `${label} rent data for ${area.name}, ${CITY_LABEL}. Renter reports, owner-direct homes and nearby comparisons.`,
    alternates: { canonical: `/chennai/${area.slug}/${bhkSlug}` },
    // A page with a thin sample is useful to a visitor but should not be indexed.
    robots: indexable ? { index: true, follow: true } : { index: false, follow: true },
  };
}

export default async function BhkPage({
  params,
}: {
  params: Promise<{ locality: string; bhk: string }>;
}) {
  const { locality: slug, bhk: bhkSlug } = await params;
  const bhk = SLUG_TO_BHK[bhkSlug];
  const area = await resolveArea(slug);
  if (!area || !bhk) notFound();

  const localityIds = area.localities.map((l) => l.id);
  const label = LABELS.bhk[bhk];

  const [{ stats, trend, rows }, series, listings, areaStats] = await Promise.all([
    getBhkStats(area.localities, bhk),
    getTrendSeries(localityIds, bhk, 6),
    getListings({ localityIds, bhk: [bhk], limit: 6 }),
    getAreaStats(area.localities),
  ]);

  const bins = distribution(rows.map((r) => r.rent));

  const jsonLd = stats
    ? {
        '@context': 'https://schema.org',
        '@type': 'Dataset',
        name: `${label} rent in ${area.name}, ${CITY_LABEL}`,
        description: `Renter-reported ${label} rents in ${area.name}, ${CITY_LABEL}. Median ${formatRent(stats.median)} from ${stats.sample} reports.`,
        url: `${SITE_URL}/chennai/${area.slug}/${bhkSlug}`,
        creator: { '@type': 'Organization', name: 'Rent In Chennai' },
        temporalCoverage: new Date().getFullYear().toString(),
      }
    : null;

  return (
    <>
      {jsonLd ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      ) : null}

      <section className="px-3 pt-3 sm:px-5 lg:px-8 lg:pt-4">
        <div className="relative overflow-hidden rounded-[32px] bg-ink px-6 pb-32 pt-12 text-white sm:px-10 sm:pb-36 sm:pt-16 lg:px-16">
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-32 h-[420px] w-[420px] rounded-full bg-data/22 blur-[130px]" />

          <div className="relative">
            <nav className="mb-8 flex items-center gap-2 text-xs text-white/40" aria-label="Breadcrumb">
              <Link href="/" className="tap inline-block transition-colors hover:text-white">Rent In Chennai</Link>
              <span>/</span>
              <Link href={`/chennai/${area.slug}`} className="tap inline-block transition-colors hover:text-white">{area.name}</Link>
              <span>/</span>
              <span className="text-white/70">{label}</span>
            </nav>

            <Eyebrow className="text-owner">{label} rent</Eyebrow>
            <h1 className="mt-5 max-w-3xl text-headline font-semibold uppercase break-words">
              {label} in {area.name}
            </h1>

            <div className="mt-10 flex flex-wrap items-end gap-x-14 gap-y-8">
              {stats ? (
                <div>
                  <p className="text-display font-semibold leading-none tabular-nums">{formatRent(stats.median)}</p>
                  <p className="mt-4 flex items-center gap-3 text-sm text-white/55">
                    Median {label} rent
                    {trend ? <TrendPill pct={trend.pct} dark /> : null}
                  </p>
                </div>
              ) : (
                <div className="max-w-md">
                  <p className="text-headline font-semibold leading-[1.05]">Not enough renter data yet</p>
                  <p className="mt-4 text-sm text-white/55">
                    We publish a {label} median for {area.name} once {MIN_SAMPLE} renters have
                    reported. So far {rows.length === 0 ? 'none have' : `${rows.length} have`}.
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-x-12 gap-y-6">
                <Stat label={`${label} reports`} value={rows.length.toLocaleString('en-IN')} tone="light" />
                <Stat label="All sizes" value={areaStats.reportCount.toLocaleString('en-IN')} tone="light" />
                <Stat label="Owner homes" value={listings.length.toLocaleString('en-IN')} tone="light" />
              </div>
            </div>

            <div className="mt-10 flex flex-wrap gap-2">
              {BHK_OPTIONS.filter((o) => o.value !== bhk).map((o) => (
                <Link
                  key={o.value}
                  href={`/chennai/${area.slug}/${BHK_SLUGS[o.value]}`}
                  className="rounded-pill border border-white/15 px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:border-owner hover:text-owner"
                >
                  {o.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Container className="relative z-10 -mt-24">
        <div className="grid gap-5 lg:grid-cols-[1fr_1.25fr]">
          <div className="card p-7 sm:p-9">
            <Eyebrow>What {label} homes cost here</Eyebrow>
            {stats ? (
              <>
                <p className="mt-6 text-stat font-semibold tabular-nums">
                  {formatRentShort(stats.p25)} — {formatRentShort(stats.p75)}
                </p>
                <p className="mt-3 text-sm text-muted">
                  The middle half of {label} rents reported in {area.name}. Lowest{' '}
                  {formatRentShort(stats.min)}, highest {formatRentShort(stats.max)}.
                </p>
                <div className="mt-8 border-t border-line pt-7">
                  <Eyebrow className="mb-5">Distribution</Eyebrow>
                  {bins.length ? (
                    <DistributionChart bins={bins} median={stats.median} />
                  ) : (
                    <p className="text-sm text-muted">Not enough reports to plot a distribution yet.</p>
                  )}
                </div>
              </>
            ) : (
              <div className="mt-6">
                <EmptyState
                  body={`Be one of the first ${label} renters in ${area.name} to share what you pay.`}
                />
              </div>
            )}
          </div>

          <div className="card p-7 sm:p-9">
            <Eyebrow>{label} trend · last 6 months</Eyebrow>
            <div className="mt-8">
              <TrendLine points={series} />
            </div>
            <div className="mt-8 border-t border-line pt-7">
              <SectionHeader
                eyebrow="From renters"
                title={`Recent ${label} reports`}
                href={`/chennai/${area.slug}`}
                hrefLabel={`All ${area.name} data`}
              />
              <ReportList reports={rows} limit={5} />
            </div>
          </div>
        </div>
      </Container>

      <Container className="mt-16">
        <SectionHeader
          eyebrow="Zero brokerage"
          title={`${label} homes in ${area.name}`}
          href="/listings"
          hrefLabel="All homes"
        />
        {listings.length ? (
          <ListingGrid listings={listings} />
        ) : (
          <EmptyState
            title={`No owner-listed ${label} homes in ${area.name} right now`}
            body="Tell us what you need and we will match you the moment one is listed."
            cta={{ href: '/find', label: 'Find a home' }}
          />
        )}
      </Container>

      <Container className="mt-16">
        <div className="card flex flex-col items-start justify-between gap-6 p-7 sm:flex-row sm:items-center sm:p-9">
          <div>
            <p className="text-title font-semibold tracking-tight">
              Renting a {label} in {area.name}?
            </p>
            <p className="mt-2 max-w-md text-sm text-muted">
              Adding what you pay takes under a minute and sharpens this page for everyone who reads
              it next.
            </p>
          </div>
          <ButtonLink href="/submit-rent" size="lg">
            Submit Your Rent
          </ButtonLink>
        </div>
      </Container>
    </>
  );
}
