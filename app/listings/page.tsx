import type { Metadata } from 'next';
import Link from 'next/link';
import { Container, Eyebrow, EmptyState, ButtonLink, Pill } from '@/components/ui/primitives';
import { ListingGrid } from '@/components/listings/ListingCard';
import { getListings, countListings } from '@/services/listings';
import { getLocalities } from '@/services/localities';
import { BHK_OPTIONS, BHK_VALUES, FURNISHING_OPTIONS } from '@/lib/constants';
import { formatRentShort } from '@/lib/format';
import type { Bhk, Furnishing } from '@/types';

export const revalidate = 120;

export const metadata: Metadata = {
  title: 'Owner-direct homes for rent in Chennai — zero brokerage',
  description:
    'Browse homes listed directly by owners across Chennai. No brokerage, no broker calls, contact details handled safely.',
  alternates: { canonical: '/listings' },
};

const RENT_STEPS = [15_000, 20_000, 25_000, 30_000, 40_000, 60_000];

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k][0] : sp[k]) as string | undefined;

  const bhkParam = one('bhk');
  const bhk = bhkParam && (BHK_VALUES as string[]).includes(bhkParam) ? ([bhkParam] as Bhk[]) : undefined;
  const furnishingParam = one('furnishing');
  const furnishing = furnishingParam
    ? ([furnishingParam] as Furnishing[])
    : undefined;
  const maxRent = Number(one('maxRent')) || undefined;
  const localitySlug = one('locality');

  const localities = await getLocalities();
  const locality = localitySlug ? localities.find((l) => l.slug === localitySlug) : undefined;

  const filters = {
    bhk,
    furnishing,
    maxRent,
    localityIds: locality ? [locality.id] : undefined,
  };

  const [listings, total] = await Promise.all([
    getListings({ ...filters, limit: 48 }),
    countListings(filters),
  ]);

  const buildHref = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = {
      bhk: bhkParam,
      furnishing: furnishingParam,
      maxRent: maxRent ? String(maxRent) : undefined,
      locality: localitySlug,
      ...patch,
    };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const qs = params.toString();
    return qs ? `/listings?${qs}` : '/listings';
  };

  const hasFilters = Boolean(bhkParam || furnishingParam || maxRent || localitySlug);

  return (
    <Container className="pt-8 lg:pt-14">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <Eyebrow>Owner direct · zero brokerage</Eyebrow>
          <h1 className="mt-4 max-w-2xl text-headline font-semibold uppercase tracking-tight">
            Homes listed by owners
          </h1>
          <p className="mt-4 max-w-lg text-[0.9375rem] text-muted">
            {total.toLocaleString('en-IN')} {total === 1 ? 'home' : 'homes'} live right now. Every one
            of them comes straight from the owner.
          </p>
        </div>
        <ButtonLink href="/list-property" size="lg">
          List Your Property
        </ButtonLink>
      </div>

      {/* --------------------------------------------------- Filters */}
      <div className="mt-10 space-y-4 rounded-card border border-line bg-surface p-5 sm:p-6">
        <FilterRow label="Size">
          <FilterChip href={buildHref({ bhk: undefined })} active={!bhkParam}>Any</FilterChip>
          {BHK_OPTIONS.map((o) => (
            <FilterChip key={o.value} href={buildHref({ bhk: o.value })} active={bhkParam === o.value}>
              {o.label}
            </FilterChip>
          ))}
        </FilterRow>

        <FilterRow label="Max rent">
          <FilterChip href={buildHref({ maxRent: undefined })} active={!maxRent}>Any</FilterChip>
          {RENT_STEPS.map((step) => (
            <FilterChip key={step} href={buildHref({ maxRent: String(step) })} active={maxRent === step}>
              {formatRentShort(step)}
            </FilterChip>
          ))}
        </FilterRow>

        <FilterRow label="Furnishing">
          <FilterChip href={buildHref({ furnishing: undefined })} active={!furnishingParam}>Any</FilterChip>
          {FURNISHING_OPTIONS.map((o) => (
            <FilterChip key={o.value} href={buildHref({ furnishing: o.value })} active={furnishingParam === o.value}>
              {o.short}
            </FilterChip>
          ))}
        </FilterRow>

        <FilterRow label="Locality">
          <FilterChip href={buildHref({ locality: undefined })} active={!localitySlug}>All Chennai</FilterChip>
          {localities.slice(0, 10).map((l) => (
            <FilterChip key={l.id} href={buildHref({ locality: l.slug })} active={localitySlug === l.slug}>
              {l.name}
            </FilterChip>
          ))}
        </FilterRow>

        {hasFilters ? (
          <div className="flex items-center gap-3 border-t border-line pt-4">
            <Pill tone="data">{listings.length} shown</Pill>
            <Link href="/listings" className="text-sm font-semibold text-muted hover:text-ink">
              Clear filters
            </Link>
          </div>
        ) : null}
      </div>

      <div className="mt-8">
        {listings.length ? (
          <ListingGrid listings={listings} />
        ) : (
          <EmptyState
            title={hasFilters ? 'No homes match those filters' : 'No owner listings yet'}
            body={
              hasFilters
                ? 'Try widening the budget or the locality — or tell us what you need and we will match you as homes arrive.'
                : 'NammaChennai.rent is owner-direct only. Be the first owner to list a home here.'
            }
            cta={hasFilters ? { href: '/find', label: 'Find a home' } : { href: '/list-property', label: 'List Your Property' }}
          />
        )}
      </div>
    </Container>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="eyebrow w-24 shrink-0 text-faint">{label}</span>
      <div className="hide-scrollbar flex flex-1 flex-wrap gap-2">{children}</div>
    </div>
  );
}

function FilterChip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      className={`rounded-pill border px-4 py-2.5 text-sm font-medium transition-colors ${
        active ? 'border-ink bg-ink text-white' : 'border-line-strong text-muted hover:border-ink hover:text-ink'
      }`}
    >
      {children}
    </Link>
  );
}
