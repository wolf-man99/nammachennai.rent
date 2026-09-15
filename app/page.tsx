import Link from 'next/link';
import type { Metadata } from 'next';
import { Container, Eyebrow, ButtonLink, SectionHeader, EmptyState, Pill } from '@/components/ui/primitives';
import { LocalitySearch } from '@/components/navigation/LocalitySearch';
import { CityIndexPanel } from '@/components/rent-data/CityIndex';
import { LocalityCard } from '@/components/rent-data/LocalityCard';
import { RecentTicker, type TickerEntry } from '@/components/rent-data/RecentTicker';
import { ListingGrid } from '@/components/listings/ListingCard';
import { BarSeries } from '@/components/charts';
import { getLocalities, getLocalityMap } from '@/services/localities';
import { getBestValueLocalities, getCityIndex, getLocalitySummaries, getSubmissions, getTrendSeries } from '@/services/rent-stats';
import { getListings } from '@/services/listings';
import { formatRentShort } from '@/lib/format';
import { MIN_SAMPLE, SITE_URL } from '@/lib/constants';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Chennai Rent Prices & Owner-Direct Homes | NammaChennai.rent',
  description:
    'See what Chennai renters are actually paying, compare neighbourhoods and find owner-direct homes with zero brokerage.',
  alternates: { canonical: '/' },
};

const EXAMPLES = ['OMR', 'Velachery', 'Sholinganallur', '2 BHK OMR'];

export default async function HomePage() {
  const [localities, index, summaries, trend, listings, bestValue, recent, localityMap] =
    await Promise.all([
      getLocalities(),
      getCityIndex(),
      getLocalitySummaries(),
      getTrendSeries(null, '2BHK', 6),
      getListings({ limit: 6 }),
      getBestValueLocalities(4),
      getSubmissions(),
      getLocalityMap(),
    ]);

  const ticker: TickerEntry[] = recent.slice(0, 5).map((r) => ({
    id: r.id,
    bhk: r.bhk,
    rent: r.rent,
    locality: localityMap.get(r.locality_id)?.name ?? 'Chennai',
    slug: localityMap.get(r.locality_id)?.slug ?? '',
    createdAt: r.created_at,
  }));

  const popular = [...summaries]
    .sort((a, b) => b.reports - a.reports || a.locality.tier - b.locality.tier)
    .slice(0, 8);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'NammaChennai.rent',
    url: SITE_URL,
    description:
      'Rent intelligence for Chennai — renter-reported rents, locality medians and owner-direct homes.',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/explore?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ---------------------------------------------------------- Hero */}
      <section className="px-3 pt-3 sm:px-5 lg:px-8 lg:pt-4">
        <div className="relative overflow-hidden rounded-[32px] bg-ink px-6 pb-40 pt-14 text-white sm:px-10 sm:pb-44 sm:pt-20 lg:px-16 lg:pt-24">
          <Glow />

          <div className="relative grid gap-12 lg:grid-cols-[1.35fr_1fr] lg:items-center lg:gap-16">
            <div className="min-w-0">
            <Eyebrow className="text-owner">Chennai rent intelligence</Eyebrow>

            <h1 className="mt-7 max-w-4xl text-display font-semibold">
              What does rent
              <br />
              really cost in
              <br />
              <span className="text-owner">Chennai?</span>
            </h1>

            <p className="mt-7 max-w-xl text-base leading-relaxed text-white/60 sm:text-lg">
              See what Chennai renters are actually paying, compare neighbourhoods and find
              owner-direct homes.
            </p>

            <div className="mt-10 max-w-2xl">
              <LocalitySearch localities={localities} tone="dark" />
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-xs text-white/35">Try</span>
                {EXAMPLES.map((e) => (
                  <Link
                    key={e}
                    href={`/explore?q=${encodeURIComponent(e)}`}
                    className="rounded-pill border border-white/15 px-4 py-2.5 text-xs font-medium text-white/70 transition-colors hover:border-owner hover:text-owner"
                  >
                    {e}
                  </Link>
                ))}
              </div>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <ButtonLink href="/map" variant="accent" size="lg">
                Explore Rent Map
              </ButtonLink>
              <ButtonLink href="/find" variant="light">
                Find a Home
              </ButtonLink>
              <ButtonLink href="/list-property" variant="light">
                List Your Property
              </ButtonLink>
              <ButtonLink href="/submit-rent" variant="light">
                Submit Your Rent
              </ButtonLink>
            </div>
            </div>

            <div className="hidden lg:block">
              <RecentTicker entries={ticker} />
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------- Rent intelligence */}
      <Container className="relative z-10 -mt-32 sm:-mt-36">
        <div className="animate-rise">
          <CityIndexPanel index={index} trend={trend} />
        </div>
      </Container>

      {/* ------------------------------------------------------ Rent map */}
      <Container className="mt-20">
        <MapTeaser summaries={summaries} />
      </Container>

      {/* --------------------------------------------- Locality insights */}
      <Container className="mt-20">
        <SectionHeader
          eyebrow="Locality insights"
          title="Popular Chennai localities"
          href="/explore"
          hrefLabel="Explore all localities"
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {popular.map((s, i) => (
            <LocalityCard key={s.locality.id} summary={s} rank={i + 1} />
          ))}
        </div>
      </Container>

      {/* ------------------------------------------------- Best value */}
      <Container className="mt-20">
        <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
          <section className="card p-7 sm:p-9">
            <SectionHeader
              eyebrow="Value analysis"
              title="Best value localities"
              href="/explore"
              hrefLabel="Compare localities"
            />
            {bestValue.length ? (
              <ul className="divide-y divide-line">
                {bestValue.map((b) => (
                  <li key={b.locality.id}>
                    <Link
                      href={`/chennai/${b.locality.slug}`}
                      className="group flex items-center justify-between gap-4 py-4 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold tracking-tight transition-colors group-hover:text-data">
                          {b.locality.name}
                        </p>
                        <p className="mt-0.5 text-xs text-faint">
                          {b.reports} renter {b.reports === 1 ? 'report' : 'reports'} · {b.locality.zone}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <BarSeries
                          values={[b.twoBhk!.p25, b.twoBhk!.median, b.twoBhk!.p75, b.twoBhk!.max]}
                          height={26}
                          tone="data"
                          className="hidden w-16 sm:flex"
                          animated={false}
                        />
                        <span className="w-20 text-right text-lg font-semibold tabular-nums">
                          {formatRentShort(b.twoBhk!.median)}
                        </span>
                        <span
                          className={`w-16 text-right text-sm font-semibold tabular-nums ${
                            b.delta < 0 ? 'text-owner-ink' : 'text-data'
                          }`}
                        >
                          {b.delta > 0 ? '+' : ''}
                          {b.delta}%
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                title="Not enough renter data yet"
                body={`Value comparison needs at least ${MIN_SAMPLE} 2 BHK reports in three or more localities.`}
              />
            )}
          </section>

          <ContributeCard reports={index.totalReports} />
        </div>
      </Container>

      {/* --------------------------------------------- Owner-direct homes */}
      <Container className="mt-20">
        <SectionHeader
          eyebrow="Zero brokerage"
          title="Owner-direct homes"
          href="/listings"
          hrefLabel="See all homes"
        />
        {listings.length ? (
          <ListingGrid listings={listings} />
        ) : (
          <EmptyState
            title="No owner listings yet"
            body="NammaChennai.rent is owner-direct only. Be the first owner to list a home — it takes two minutes and costs nothing."
            cta={{ href: '/list-property', label: 'List Your Property' }}
          />
        )}
      </Container>

      {/* --------------------------------------------------- More product */}
      <Container className="mt-20">
        <SectionHeader eyebrow="More ways to use NammaChennai.rent" title="Beyond the listings" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            href="/find"
            eyebrow="Seekers"
            title="Tell us what you need"
            body="Describe the home you want and we match it against every owner listing as they arrive."
            tone="data"
          />
          <FeatureCard
            href="/flatmates"
            eyebrow="Flatmates"
            title="Rooms and shared flats"
            body="Find a room, a flatmate or someone to split an OMR two-bedroom with."
            tone="owner"
          />
          <FeatureCard
            href="/to-let"
            eyebrow="To-Let"
            title="Report a board you walked past"
            body="Chennai's rental market still lives on physical boards. Photograph one and it becomes searchable."
            tone="tolet"
          />
        </div>
      </Container>
    </>
  );
}

/* ------------------------------------------------------------------ */

function Glow() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <div className="absolute -right-24 -top-32 h-[420px] w-[420px] rounded-full bg-data/25 blur-[130px]" />
      <div className="absolute -bottom-40 left-1/4 h-[360px] w-[360px] rounded-full bg-owner/12 blur-[120px]" />
    </div>
  );
}

function MapTeaser({ summaries }: { summaries: Awaited<ReturnType<typeof getLocalitySummaries>> }) {
  const withData = summaries.filter((s) => s.stats).slice(0, 6);

  return (
    <div className="relative overflow-hidden rounded-card bg-ink p-7 text-white sm:p-10">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.16]">
        <GridLines />
      </div>

      <div className="relative grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        <div>
          <Eyebrow className="text-owner">Rent map</Eyebrow>
          <h2 className="mt-5 max-w-md text-headline font-semibold">
            Every rent report, listing and To-Let board on one map.
          </h2>
          <p className="mt-5 max-w-md text-[0.9375rem] leading-relaxed text-white/55">
            Filter by BHK, budget and furnishing, then tap any area to see what renters there are
            really paying.
          </p>

          <div className="mt-7 flex flex-wrap gap-2.5">
            <Legend tone="data" label="Rent reports" />
            <Legend tone="owner" label="Owner listings" />
            <Legend tone="tolet" label="To-Let boards" />
          </div>

          <ButtonLink href="/map" variant="accent" size="lg" className="mt-8">
            Explore Rent Map
          </ButtonLink>
        </div>

        <div className="rounded-panel border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm">
          <p className="eyebrow mb-5 text-white/40">Where renters are reporting</p>
          {withData.length ? (
            <ul className="space-y-3.5">
              {withData.map((s) => (
                <li key={s.locality.id}>
                  <Link href={`/chennai/${s.locality.slug}`} className="group flex items-center gap-4">
                    <span className="w-28 shrink-0 truncate text-sm font-medium text-white/85 transition-colors group-hover:text-owner">
                      {s.locality.name}
                    </span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                      <span
                        className="block h-full rounded-full bg-data transition-all duration-500"
                        style={{
                          width: `${Math.min(100, (s.reports / Math.max(...withData.map((w) => w.reports))) * 100)}%`,
                        }}
                      />
                    </span>
                    <span className="w-16 shrink-0 text-right text-sm font-semibold tabular-nums text-white">
                      {formatRentShort(s.stats!.median)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              dark
              compact
              title="The map is waiting for its first reports"
              body="Add what you pay and your locality appears here."
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Legend({ tone, label }: { tone: 'data' | 'owner' | 'tolet'; label: string }) {
  const dot = { data: 'bg-data', owner: 'bg-owner', tolet: 'bg-tolet' }[tone];
  return (
    <span className="inline-flex items-center gap-2 rounded-pill border border-white/12 px-3 py-1.5 text-xs font-medium text-white/70">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

function GridLines() {
  return (
    <svg width="100%" height="100%" aria-hidden="true">
      <defs>
        <pattern id="grid" width="56" height="56" patternUnits="userSpaceOnUse">
          <path d="M56 0H0v56" fill="none" stroke="white" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
    </svg>
  );
}

function ContributeCard({ reports }: { reports: number }) {
  return (
    <section className="flex flex-col justify-between rounded-card bg-owner p-7 sm:p-9">
      <div>
        <Eyebrow className="text-owner-ink">Help the data</Eyebrow>
        <p className="mt-5 text-title font-semibold leading-[1.1] tracking-tight text-ink">
          Every median here came from a renter like you.
        </p>
        <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink/70">
          Share what you pay — anonymously, in under a minute. No account, no phone number, no
          broker calls.
        </p>
      </div>

      <div className="mt-8">
        <p className="text-stat font-semibold tabular-nums text-ink">{reports.toLocaleString('en-IN')}</p>
        <p className="mt-1 text-sm text-ink/60">
          {reports === 1 ? 'rent report so far' : 'rent reports so far'}
        </p>
        <ButtonLink href="/submit-rent" variant="primary" size="lg" className="mt-6 w-full">
          Submit Your Rent
        </ButtonLink>
      </div>
    </section>
  );
}

function FeatureCard({
  href,
  eyebrow,
  title,
  body,
  tone,
}: {
  href: string;
  eyebrow: string;
  title: string;
  body: string;
  tone: 'data' | 'owner' | 'tolet';
}) {
  const accents = {
    data: 'group-hover:border-data',
    owner: 'group-hover:border-owner-ink',
    tolet: 'group-hover:border-tolet',
  };
  return (
    <Link
      href={href}
      className={`group flex flex-col justify-between rounded-card border border-line bg-surface p-7 transition-all duration-300 ease-[var(--ease-out-soft)] hover:-translate-y-1 ${accents[tone]}`}
    >
      <div>
        <Pill tone={tone}>{eyebrow}</Pill>
        <p className="mt-5 text-lg font-semibold tracking-tight">{title}</p>
        <p className="mt-2.5 text-sm leading-relaxed text-muted">{body}</p>
      </div>
      <span className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-ink">
        Open
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1">
          <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </Link>
  );
}
