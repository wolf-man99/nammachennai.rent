import type { Metadata } from 'next';
import Link from 'next/link';
import { ButtonLink, Container, EmptyState, Eyebrow, Pill } from '@/components/ui/primitives';
import { FlatmateCard } from '@/components/listings/FlatmateCard';
import { getFlatmateListings } from '@/services/flatmates';
import { getLocalities } from '@/services/localities';
import { ROOM_TYPE_OPTIONS } from '@/lib/constants';
import type { RoomType } from '@/types';

export const revalidate = 120;

export const metadata: Metadata = {
  title: 'Flatmates and rooms for rent in Chennai',
  description:
    'Find a room, a flatmate or a shared flat in Chennai. Contact details stay private until both sides agree.',
  alternates: { canonical: '/flatmates' },
};

export default async function FlatmatesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k][0] : sp[k]) as string | undefined;
  const roomTypeParam = one('room');
  const localitySlug = one('locality');

  const localities = await getLocalities();
  const locality = localitySlug ? localities.find((l) => l.slug === localitySlug) : undefined;

  const listings = await getFlatmateListings({
    roomType: roomTypeParam ? ([roomTypeParam] as RoomType[]) : undefined,
    localityIds: locality ? [locality.id] : undefined,
    limit: 48,
  });

  const href = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { room: roomTypeParam, locality: localitySlug, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const qs = params.toString();
    return qs ? `/flatmates?${qs}` : '/flatmates';
  };

  return (
    <Container className="pt-8 lg:pt-14">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <Eyebrow>Shared living</Eyebrow>
          <h1 className="mt-4 max-w-2xl text-headline font-semibold uppercase tracking-tight">
            Rooms and flatmates
          </h1>
          <p className="mt-4 max-w-lg text-[0.9375rem] text-muted">
            Splitting a flat is how most people afford OMR. Post a room or find one — numbers stay
            private until you choose to share them.
          </p>
        </div>
        <ButtonLink href="/flatmates/new" size="lg">
          Post a room
        </ButtonLink>
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-2">
        <span className="eyebrow mr-2 text-faint">Room type</span>
        <Chip href={href({ room: undefined })} active={!roomTypeParam}>All</Chip>
        {ROOM_TYPE_OPTIONS.map((o) => (
          <Chip key={o.value} href={href({ room: o.value })} active={roomTypeParam === o.value}>
            {o.label}
          </Chip>
        ))}
        {locality ? <Pill tone="data">{locality.name}</Pill> : null}
      </div>

      <div className="mt-8">
        {listings.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((l) => (
              <FlatmateCard key={l.id} listing={l} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No rooms posted yet"
            body="Be the first to post a room or a spare bedroom. It takes a minute and costs nothing."
            cta={{ href: '/flatmates/new', label: 'Post a room' }}
          />
        )}
      </div>
    </Container>
  );
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`rounded-pill border px-4 py-2 text-sm font-medium transition-colors ${
        active ? 'border-ink bg-ink text-white' : 'border-line-strong text-muted hover:border-ink hover:text-ink'
      }`}
    >
      {children}
    </Link>
  );
}
