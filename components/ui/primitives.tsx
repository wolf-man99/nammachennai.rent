import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

type Tone = 'data' | 'owner' | 'tolet' | 'neutral' | 'success' | 'warning' | 'error';

const toneClasses: Record<Tone, string> = {
  data: 'bg-data-soft text-data',
  owner: 'bg-owner text-ink',
  tolet: 'bg-tolet-soft text-tolet',
  neutral: 'bg-ground text-muted',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  error: 'bg-error-soft text-error',
};

export function Pill({
  children,
  tone = 'neutral',
  className = '',
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill px-3 py-1 text-xs font-semibold tracking-tight ${toneClasses[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function Eyebrow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`eyebrow text-faint ${className}`}>{children}</p>;
}

export function Container({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1320px] px-5 sm:px-8 ${className}`}>{children}</div>;
}

export function Card({
  children,
  className = '',
  as: As = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article' | 'li';
}) {
  return <As className={`card ${className}`}>{children}</As>;
}

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

type Variant = 'primary' | 'accent' | 'outline' | 'ghost' | 'light';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary: 'bg-ink text-white hover:bg-ink-soft',
  accent: 'bg-owner text-ink hover:brightness-95',
  outline: 'border border-line-strong bg-surface text-ink hover:border-ink',
  ghost: 'text-ink hover:bg-ground',
  light: 'bg-white/10 text-white hover:bg-white/20 backdrop-blur',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-5 text-[0.9375rem]',
  lg: 'h-14 px-7 text-base',
};

function buttonClass(variant: Variant, size: Size, className = '') {
  return `inline-flex items-center justify-center gap-2 rounded-pill font-semibold tracking-tight transition-all duration-200 ease-[var(--ease-out-soft)] disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98] ${variants[variant]} ${sizes[size]} ${className}`;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ComponentProps<'button'> & { variant?: Variant; size?: Size }) {
  return <button {...props} className={buttonClass(variant, size, className)} />;
}

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link {...props} className={buttonClass(variant, size, className)} />;
}

/** The circular arrow affordance used on every section header. */
export function ArrowCircle({
  href,
  label,
  dark = false,
}: {
  href: string;
  label: string;
  dark?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={`group flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-all duration-200 ease-[var(--ease-out-soft)] ${
        dark
          ? 'border-white/20 text-white hover:border-owner hover:bg-owner hover:text-ink'
          : 'border-line-strong text-ink hover:border-ink hover:bg-ink hover:text-white'
      }`}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M3 8h10M9 4l4 4-4 4"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-transform duration-200 ease-[var(--ease-out-soft)] group-hover:translate-x-0.5"
        />
      </svg>
    </Link>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  href,
  hrefLabel,
  dark = false,
  children,
}: {
  eyebrow?: string;
  title: string;
  href?: string;
  hrefLabel?: string;
  dark?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="mb-7 flex items-end justify-between gap-6">
      <div>
        {eyebrow ? (
          <p className={`eyebrow mb-3 ${dark ? 'text-white/45' : 'text-faint'}`}>{eyebrow}</p>
        ) : null}
        <h2 className={`text-title font-semibold ${dark ? 'text-white' : 'text-ink'}`}>{title}</h2>
        {children}
      </div>
      {href ? <ArrowCircle href={href} label={hrefLabel ?? title} dark={dark} /> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Stats + empty states                                                */
/* ------------------------------------------------------------------ */

export function Stat({
  label,
  value,
  sub,
  tone = 'ink',
  className = '',
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: 'ink' | 'light';
  className?: string;
}) {
  return (
    <div className={className}>
      <p className={`eyebrow mb-3 ${tone === 'light' ? 'text-white/45' : 'text-faint'}`}>{label}</p>
      <p
        className={`text-stat font-semibold tabular-nums ${tone === 'light' ? 'text-white' : 'text-ink'}`}
      >
        {value}
      </p>
      {sub ? (
        <p className={`mt-2 text-sm ${tone === 'light' ? 'text-white/55' : 'text-muted'}`}>{sub}</p>
      ) : null}
    </div>
  );
}

export function EmptyState({
  title = 'Not enough renter data yet',
  body = 'Be one of the first renters to share your rent.',
  cta = { href: '/submit-rent', label: 'Submit Your Rent' },
  compact = false,
  dark = false,
}: {
  title?: string;
  body?: string;
  cta?: { href: string; label: string } | null;
  compact?: boolean;
  dark?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-start justify-center rounded-panel border border-dashed ${
        dark ? 'border-white/15' : 'border-line-strong'
      } ${compact ? 'p-6' : 'p-8 sm:p-10'}`}
    >
      <p className={`text-base font-semibold ${dark ? 'text-white' : 'text-ink'}`}>{title}</p>
      <p className={`mt-1.5 max-w-sm text-sm ${dark ? 'text-white/55' : 'text-muted'}`}>{body}</p>
      {cta ? (
        <ButtonLink
          href={cta.href}
          size="sm"
          variant={dark ? 'accent' : 'primary'}
          className="mt-5"
        >
          {cta.label}
        </ButtonLink>
      ) : null}
    </div>
  );
}

export function TrendPill({ pct, dark = false }: { pct: number | null; dark?: boolean }) {
  if (pct === null) return null;
  const up = pct >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-pill px-2.5 py-1 text-xs font-semibold tabular-nums ${
        up ? 'bg-data-soft text-data' : 'bg-owner-soft text-owner-ink'
      } ${dark ? 'ring-1 ring-white/10' : ''}`}
    >
      <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden="true">
        <path
          d={up ? 'M5 1.5 9 8H1z' : 'M5 8.5 1 2h8z'}
          fill="currentColor"
        />
      </svg>
      {up ? '+' : ''}
      {pct.toFixed(1)}%
    </span>
  );
}

export function Divider({ className = '' }: { className?: string }) {
  return <div className={`h-px w-full bg-line ${className}`} />;
}
