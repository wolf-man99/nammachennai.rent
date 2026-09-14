import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Container,
  Eyebrow,
  Pill,
  SectionHeader,
  ButtonLink,
  EmptyState,
} from '@/components/ui/primitives';
import { RangeBar } from '@/components/charts';
import { ContactOwner } from '@/components/listings/ContactOwner';
import { ReportEntity } from '@/components/listings/ReportEntity';
import { ListingGrid } from '@/components/listings/ListingCard';
import { NoPhoto } from '@/components/listings/NoPhoto';
import { getListing, getRentContext, getSimilarListings } from '@/services/listings';
import { LABELS, SITE_URL } from '@/lib/constants';
import { formatDate, formatRent, formatRentShort, relativeTime } from '@/lib/format';

export const revalidate = 120;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) return { title: 'Home not found' };

  const label = LABELS.bhk[listing.bhk];
  const place = listing.locality?.name ?? 'Chennai';
  return {
    title: `${label} for rent in ${place} — ${formatRent(listing.rent)}/month`,
    description:
      listing.description?.slice(0, 155) ??
      `Owner-direct ${label} in ${place}, Chennai at ${formatRent(listing.rent)} per month. No brokerage.`,
    alternates: { canonical: `/property/${listing.id}` },
    openGraph: {
      title: `${label} in ${place} — ${formatRent(listing.rent)}/month`,
      description: 'Owner-direct, zero brokerage, on Chennai.rent.',
      images: listing.photos.length ? [listing.photos[0]] : undefined,
    },
  };
}

export default async function PropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) notFound();

  const [context, similar] = await Promise.all([
    getRentContext(listing),
    getSimilarListings(listing, 3),
  ]);

  const label = LABELS.bhk[listing.bhk];
  const place = listing.locality?.name ?? 'Chennai';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Apartment',
    name: listing.title ?? `${label} in ${place}`,
    numberOfRooms: listing.bhk.replace(/\D/g, '') || undefined,
    floorSize: listing.area_sqft
      ? { '@type': 'QuantitativeValue', value: listing.area_sqft, unitCode: 'FTK' }
      : undefined,
    address: {
      '@type': 'PostalAddress',
      addressLocality: place,
      addressRegion: 'Tamil Nadu',
      addressCountry: 'IN',
    },
    url: `${SITE_URL}/property/${listing.id}`,
  };

  const delta = context.deltaPct;
  const verdictSentence = context.verdict
    ? delta !== null && Math.abs(delta) >= 1
      ? `${Math.abs(delta)}% ${context.verdict === 'below' ? 'below' : context.verdict === 'above' ? 'above' : 'either side of'} that`
      : 'right at that level'
    : 'close to that level';

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Container className="pt-6 lg:pt-10">
        <nav className="mb-7 flex flex-wrap items-center gap-2 text-xs text-faint" aria-label="Breadcrumb">
          <Link href="/" className="transition-colors hover:text-ink">Chennai.rent</Link>
          <span>/</span>
          <Link href="/listings" className="transition-colors hover:text-ink">Homes</Link>
          <span>/</span>
          {listing.locality ? (
            <>
              <Link href={`/chennai/${listing.locality.slug}`} className="transition-colors hover:text-ink">
                {place}
              </Link>
              <span>/</span>
            </>
          ) : null}
          <span className="text-muted">{label}</span>
        </nav>

        {/* ------------------------------------------------- Gallery */}
        <Gallery photos={listing.photos} label={label} place={place} />

        <div className="mt-10 grid gap-10 lg:grid-cols-[1.5fr_1fr] lg:gap-14">
          {/* --------------------------------------------- Main column */}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone="owner">Owner direct</Pill>
              <Pill tone="neutral">{LABELS.propertyType[listing.property_type]}</Pill>
              <span className="text-xs text-faint">Listed {relativeTime(listing.created_at)}</span>
            </div>

            <h1 className="mt-5 text-headline font-semibold uppercase tracking-tight">
              {label}
              <br />
              {place}
            </h1>

            {listing.title ? (
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">{listing.title}</p>
            ) : null}

            <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-8 border-t border-line pt-9 sm:grid-cols-4">
              <Fact label="Rent" value={formatRent(listing.rent)} sub="per month" />
              <Fact label="Deposit" value={listing.deposit ? formatRent(listing.deposit) : '—'} sub={listing.deposit ? 'refundable' : 'not stated'} />
              <Fact label="Maintenance" value={listing.maintenance ? formatRent(listing.maintenance) : '—'} sub={listing.maintenance ? 'per month' : 'not stated'} />
              <Fact label="Size" value={listing.area_sqft ? `${listing.area_sqft.toLocaleString('en-IN')}` : '—'} sub={listing.area_sqft ? 'sq ft' : 'not stated'} />
            </dl>

            <dl className="mt-9 grid grid-cols-2 gap-x-6 gap-y-8 border-t border-line pt-9 sm:grid-cols-4">
              <Fact label="Furnishing" value={LABELS.furnishing[listing.furnishing]} />
              <Fact label="Parking" value={listing.parking ? LABELS.parking[listing.parking] : '—'} />
              <Fact label="Available" value={listing.available_from ? formatDate(listing.available_from) : 'Now'} />
              <Fact label="Locality" value={place} />
            </dl>

            {listing.description ? (
              <div className="mt-10 border-t border-line pt-9">
                <Eyebrow className="mb-4">About this home</Eyebrow>
                <p className="max-w-xl whitespace-pre-line text-[0.9375rem] leading-relaxed text-muted">
                  {listing.description}
                </p>
              </div>
            ) : null}

            {/* ----------------------------------- Is this rent fair? */}
            <section className="mt-10 rounded-card border border-line bg-surface p-7 sm:p-9">
              <SectionHeader
                eyebrow="Rent comparison"
                title="Is this rent fair?"
                href={listing.locality ? `/chennai/${listing.locality.slug}` : undefined}
                hrefLabel={`${place} rent data`}
              />

              {context.reported ? (
                <>
                  <p className="max-w-xl text-[0.9375rem] leading-relaxed text-muted">
                    Renters in {place} report a median of{' '}
                    <strong className="text-ink">{formatRent(context.reported.median)}</strong> for a{' '}
                    {label}, from {context.reported.sample} reports. This home is{' '}
                    <strong className="text-ink">{verdictSentence}</strong>.
                  </p>

                  <div className="mt-8">
                    <RangeBar
                      min={context.reported.min}
                      max={context.reported.max}
                      p25={context.reported.p25}
                      p75={context.reported.p75}
                      median={context.reported.median}
                      marker={listing.rent}
                      markerLabel={`This home · ${formatRentShort(listing.rent)}`}
                    />
                  </div>
                </>
              ) : (
                <EmptyState
                  title="Not enough renter data to judge this rent yet"
                  body={`We need more ${label} reports from ${place} before we can say whether this is a fair price.`}
                />
              )}

              {context.comparableRents.length ? (
                <div className="mt-9 border-t border-line pt-7">
                  <Eyebrow className="mb-4">Similar homes listed here</Eyebrow>
                  <div className="flex flex-wrap gap-2">
                    {context.comparableRents.map((r, i) => (
                      <span
                        key={i}
                        className="rounded-pill border border-line-strong px-4 py-2 text-sm font-semibold tabular-nums"
                      >
                        {formatRentShort(r)}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>

            <div className="mt-8">
              <ReportEntity entityType="listing" entityId={listing.id} />
            </div>
          </div>

          {/* ------------------------------------------------ Sidebar */}
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="card p-7">
              <p className="text-display font-semibold leading-none tabular-nums" style={{ fontSize: 'clamp(2.25rem,4vw,3rem)' }}>
                {formatRent(listing.rent)}
              </p>
              <p className="mt-2 text-sm text-muted">per month · {label} in {place}</p>

              <div className="mt-7">
                <ContactOwner endpoint={`/api/listings/${listing.id}/contact`} />
              </div>

              <div className="mt-7 space-y-2.5 border-t border-line pt-6 text-sm text-muted">
                <Row label="Deposit" value={listing.deposit ? formatRent(listing.deposit) : 'Not stated'} />
                <Row label="Maintenance" value={listing.maintenance ? formatRent(listing.maintenance) : 'Not stated'} />
                <Row
                  label="Monthly outgo"
                  value={formatRent(listing.rent + (listing.maintenance ?? 0))}
                  strong
                />
              </div>
            </div>

            <div className="mt-5 rounded-card bg-ink p-7 text-white">
              <Eyebrow className="text-owner">Renting elsewhere?</Eyebrow>
              <p className="mt-4 text-base font-semibold leading-snug">
                Add what you pay and make this comparison sharper for the next renter.
              </p>
              <ButtonLink href="/submit-rent" variant="accent" className="mt-5 w-full">
                Submit Your Rent
              </ButtonLink>
            </div>
          </aside>
        </div>
      </Container>

      {similar.length ? (
        <Container className="mt-20">
          <SectionHeader eyebrow="Nearby" title="Similar owner-direct homes" href="/listings" hrefLabel="All homes" />
          <ListingGrid listings={similar} />
        </Container>
      ) : null}
    </>
  );
}

function Fact({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <dt className="eyebrow mb-2.5 text-faint">{label}</dt>
      <dd className="text-xl font-semibold tabular-nums tracking-tight">{value}</dd>
      {sub ? <p className="mt-1 text-xs text-faint">{sub}</p> : null}
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <span className={`tabular-nums ${strong ? 'font-semibold text-ink' : ''}`}>{value}</span>
    </div>
  );
}

function Gallery({ photos, label, place }: { photos: string[]; label: string; place: string }) {
  if (!photos.length) {
    return (
      <div className="relative aspect-[16/7] overflow-hidden rounded-card border border-line">
        <NoPhoto bhk={label} seed={place} size="lg" />
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
      <div className="relative aspect-[16/11] overflow-hidden rounded-card border border-line bg-surface-sunk sm:aspect-[4/3]">
        <Image
          src={photos[0]}
          alt={`${label} in ${place}`}
          fill
          priority
          sizes="(max-width: 640px) 100vw, 60vw"
          className="object-cover"
        />
      </div>
      {photos.length > 1 ? (
        <div className="grid grid-rows-2 gap-3">
          {photos.slice(1, 3).map((p, i) => (
            <div key={p} className="relative overflow-hidden rounded-card border border-line bg-surface-sunk">
              <Image src={p} alt={`${label} in ${place}, photo ${i + 2}`} fill sizes="35vw" className="object-cover" />
              {i === 1 && photos.length > 3 ? (
                <span className="absolute bottom-3 right-3 rounded-pill bg-ink/85 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
                  +{photos.length - 3} more
                </span>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
