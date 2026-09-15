'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from './Logo';

const TABS = [
  { href: '/', label: 'Home', icon: 'home' },
  { href: '/map', label: 'Map', icon: 'map' },
  { href: '/listings', label: 'Homes', icon: 'home-list' },
  { href: '/submit-rent', label: 'Add rent', icon: 'plus' },
] as const;

function Icon({ name }: { name: (typeof TABS)[number]['icon'] }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (name) {
    case 'home':
      return (
        <svg width="21" height="21" viewBox="0 0 24 24" {...common} aria-hidden="true">
          <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />
        </svg>
      );
    case 'map':
      return (
        <svg width="21" height="21" viewBox="0 0 24 24" {...common} aria-hidden="true">
          <path d="m9 4 6 2.5L21 4v13.5L15 20l-6-2.5L3 20V6.5z" />
          <path d="M9 4v13.5M15 6.5V20" />
        </svg>
      );
    case 'home-list':
      return (
        <svg width="21" height="21" viewBox="0 0 24 24" {...common} aria-hidden="true">
          <rect x="3" y="4" width="18" height="16" rx="3" />
          <path d="M3 10h18M9 10v10" />
        </svg>
      );
    case 'plus':
      return (
        <svg width="21" height="21" viewBox="0 0 24 24" {...common} aria-hidden="true">
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 8.5v7M8.5 12h7" />
        </svg>
      );
  }
}

export function MobileHeader() {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-3 border-b border-line bg-ground/90 px-5 backdrop-blur-xl lg:hidden">
      <Logo />
      <Link
        href="/list-property"
        className="ml-3 inline-flex h-9 shrink-0 items-center rounded-pill bg-owner px-4 text-sm font-semibold text-ink"
      >
        List Property
      </Link>
    </header>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
      aria-label="Primary"
    >
      <ul className="flex">
        {TABS.map((t) => (
          <li key={t.href} className="flex-1">
            <Link
              href={t.href}
              className={`flex h-[60px] flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium transition-colors ${
                isActive(t.href) ? 'text-ink' : 'text-faint'
              }`}
            >
              <Icon name={t.icon} />
              {t.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
