'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Logo } from './Logo';

const SECTIONS = [
  { href: '/', label: 'Overview' },
  { href: '/map', label: 'Rent Map' },
  { href: '/explore', label: 'Explore' },
  { href: '/listings', label: 'Listings' },
  { href: '/flatmates', label: 'Flatmates' },
  { href: '/to-let', label: 'To-Let' },
];

export function TopNav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-50 hidden px-5 pt-4 lg:block sm:px-8">
      <nav
        className={`mx-auto flex h-16 max-w-[1320px] items-center justify-between rounded-pill border px-3 pl-6 transition-all duration-300 ease-[var(--ease-out-soft)] ${
          scrolled
            ? 'border-line bg-surface/85 shadow-[0_8px_30px_rgb(20_20_20/0.06)] backdrop-blur-xl'
            : 'border-transparent bg-surface/60 backdrop-blur-sm'
        }`}
      >
        <Logo />

        <ul className="flex items-center gap-1">
          {SECTIONS.map((s) => (
            <li key={s.href}>
              <Link
                href={s.href}
                className={`inline-flex h-10 items-center rounded-pill px-4 text-[0.9375rem] font-medium tracking-tight transition-colors duration-200 ${
                  isActive(s.href) ? 'bg-ink text-white' : 'text-muted hover:bg-ground hover:text-ink'
                }`}
              >
                {s.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <Link
            href="/submit-rent"
            className="inline-flex h-10 items-center rounded-pill px-4 text-[0.9375rem] font-semibold tracking-tight text-ink transition-colors hover:bg-ground"
          >
            Submit Rent
          </Link>
          <Link
            href="/list-property"
            className="inline-flex h-10 items-center rounded-pill bg-owner px-5 text-[0.9375rem] font-semibold tracking-tight text-ink transition-all duration-200 hover:brightness-95 active:scale-[0.98]"
          >
            List Property
          </Link>
        </div>
      </nav>
    </header>
  );
}
