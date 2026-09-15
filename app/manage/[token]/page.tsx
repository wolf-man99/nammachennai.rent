import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ButtonLink,
  Container,
  EmptyState,
  Eyebrow,
  Pill,
  Stat,
} from '@/components/ui/primitives';
import { OwnerListingRow } from './OwnerListingRow';
import { RememberLink } from './RememberLink';
import { getOwnerListings, resolveOwnerByToken, touchOwner } from '@/services/owner';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Your listings',
  // A secret link must never reach an index, and must not leak through a
  // Referer header when the owner clicks out to their own listing.
  robots: { index: false, follow: false, nocache: true },
  referrer: 'no-referrer',
};

export default async function ManagePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const owner = await resolveOwnerByToken(token);
  if (!owner) notFound();

  void touchOwner(owner.id);
  const listings = await getOwnerListings(owner.phone);

  const totals = listings.reduce(
    (acc, l) => ({
      views: acc.views + l.views,
      enquiries: acc.enquiries + l.enquiries.length,
      active: acc.active + (l.listing.status === 'active' ? 1 : 0),
    }),
    { views: 0, enquiries: 0, active: 0 },
  );

  return (
    <>
      <RememberLink token={token} />

      <section className="px-3 pt-3 sm:px-5 lg:px-8 lg:pt-4">
        <div className="relative overflow-hidden rounded-[32px] bg-ink px-6 pb-28 pt-12 text-white sm:px-10 sm:pt-16 lg:px-16">
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-32 h-[420px] w-[420px] rounded-full bg-owner/15 blur-[130px]" />
          <div className="relative">
            <Eyebrow className="text-owner">Your dashboard</Eyebrow>
            <h1 className="mt-5 max-w-2xl text-headline font-semibold uppercase tracking-tight">
              Your listings
            </h1>
            <p className="mt-4 text-sm text-white/55">
              Everything posted from {owner.phone.replace(/(\d{2})\d{6}(\d{2})/, '$1••••••$2')}
            </p>

            {/* Three columns even on a phone; the long labels were wrapping to a
                second row and breaking the scan. */}
            <div className="mt-10 grid grid-cols-3 gap-x-4 gap-y-8 sm:gap-x-14">
              <Stat label="Listings" value={totals.active.toLocaleString('en-IN')} tone="light" />
              <Stat label="Interested" value={totals.enquiries.toLocaleString('en-IN')} tone="light" />
              <Stat label="Viewed by" value={totals.views.toLocaleString('en-IN')} tone="light" />
            </div>
          </div>
        </div>
      </section>

      <Container className="relative z-10 -mt-20">
        {listings.length ? (
          <div className="space-y-5">
            {listings.map((summary) => (
              <OwnerListingRow key={summary.listing.id} summary={summary} token={token} />
            ))}
          </div>
        ) : (
          <div className="card p-7 sm:p-9">
            <EmptyState
              title="No listings on this number yet"
              body="Homes you publish with this phone number will appear here, with who viewed them and who asked for your number."
              cta={{ href: '/list-property', label: 'List a property' }}
            />
          </div>
        )}

        <div className="card mt-6 p-6 sm:p-7">
          <Eyebrow>Keep this link</Eyebrow>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
            This page is your dashboard. Anyone with the link can see it, so keep it to yourself —
            and bookmark it, because we cannot send it to you again. Listing another home from the
            same number issues a fresh link and retires this one.
          </p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <ButtonLink href="/list-property" size="sm">
              List another property
            </ButtonLink>
            <Link
              href="/listings"
              className="inline-flex h-9 items-center rounded-pill border border-line-strong px-4 text-sm font-semibold transition-colors hover:border-ink"
            >
              See other homes
            </Link>
          </div>
        </div>

        {totals.enquiries === 0 && totals.views > 0 ? (
          <div className="card mt-5 p-6 sm:p-7">
            <Pill tone="data">{totals.views} views, no enquiries yet</Pill>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
              People are finding your home but not asking for your number. That usually means the
              rent sits above what renters nearby report paying, or there are no photos. Your
              locality page shows what others are paying.
            </p>
            {listings[0]?.listing.locality ? (
              <Link
                href={`/chennai/${listings[0].listing.locality.slug}`}
                className="mt-4 inline-block text-sm font-semibold underline-offset-4 hover:underline"
              >
                See {listings[0].listing.locality.name} rents →
              </Link>
            ) : null}
          </div>
        ) : null}
      </Container>
    </>
  );
}
