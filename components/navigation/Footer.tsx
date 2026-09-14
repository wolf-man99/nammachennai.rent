import Link from 'next/link';
import { Container } from '@/components/ui/primitives';
import { CHENNAI_ZONES } from '@/data/localities';

const COLUMNS = [
  {
    title: 'Rent data',
    links: [
      { href: '/map', label: 'Rent map' },
      { href: '/explore', label: 'Explore localities' },
      { href: '/submit-rent', label: 'Submit your rent' },
    ],
  },
  {
    title: 'Homes',
    links: [
      { href: '/listings', label: 'Owner-direct homes' },
      { href: '/find', label: 'Find a home' },
      { href: '/list-property', label: 'List your property' },
    ],
  },
  {
    title: 'More',
    links: [
      { href: '/flatmates', label: 'Flatmates' },
      { href: '/to-let', label: 'To-Let boards' },
      { href: '/about', label: 'How this works' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-24 bg-ink pb-28 pt-16 text-white lg:pb-16">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[1.4fr_2fr]">
          <div>
            <p className="max-w-sm text-title font-semibold tracking-tight">
              Chennai rent, measured by the people paying it.
            </p>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/50">
              Every median on this site is computed from renter-submitted data. When there is not
              enough of it, we say so instead of guessing.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <p className="eyebrow mb-4 text-white/40">{col.title}</p>
                <ul className="space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="tap inline-block text-sm text-white/70 transition-colors hover:text-owner">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 border-t border-white/10 pt-8">
          <p className="eyebrow mb-4 text-white/40">Chennai corridors</p>
          <div className="flex flex-wrap gap-2">
            {CHENNAI_ZONES.map((z) => (
              <Link
                key={z.slug}
                href={`/chennai/${z.slug}`}
                className="rounded-pill border border-white/15 px-4 py-2.5 text-xs font-medium text-white/70 transition-colors hover:border-owner hover:text-owner"
              >
                {z.name}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Chennai.rent — rent intelligence for Chennai.</p>
          <p>Rent data is submitted anonymously. Contact details are never published.</p>
        </div>
      </Container>
    </footer>
  );
}
