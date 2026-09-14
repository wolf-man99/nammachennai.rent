import type { ReactNode } from 'react';
import { Container, Eyebrow, ButtonLink } from '@/components/ui/primitives';

/** Shared chrome for every submission flow: a dark statement, then one white card. */
export function FormShell({
  eyebrow,
  title,
  lede,
  aside,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  lede: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <section className="px-3 pt-3 sm:px-5 lg:px-8 lg:pt-4">
        <div className="relative overflow-hidden rounded-[32px] bg-ink px-6 pb-28 pt-12 text-white sm:px-10 sm:pb-32 sm:pt-16 lg:px-16">
          <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-28 h-[360px] w-[360px] rounded-full bg-data/20 blur-[120px]" />
          <div className="relative grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-end">
            <div>
              <Eyebrow className="text-owner">{eyebrow}</Eyebrow>
              <h1 className="mt-6 max-w-2xl text-headline font-semibold">{title}</h1>
              <p className="mt-5 max-w-lg text-[0.9375rem] leading-relaxed text-white/60 sm:text-base">
                {lede}
              </p>
            </div>
            {aside ? <div className="lg:justify-self-end">{aside}</div> : null}
          </div>
        </div>
      </section>

      <Container className="relative z-10 -mt-20 sm:-mt-24">
        <div className="mx-auto max-w-3xl">{children}</div>
      </Container>
    </>
  );
}

export function SuccessPanel({
  title,
  body,
  primary,
  secondary,
  children,
}: {
  title: string;
  body: string;
  primary: { href: string; label: string };
  secondary?: { href: string; label: string };
  children?: ReactNode;
}) {
  return (
    <div className="card animate-rise p-8 text-center sm:p-12">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-owner">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="m5 12.5 4.5 4.5L19 7.5" stroke="var(--color-ink)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <h2 className="mt-7 text-title font-semibold tracking-tight">{title}</h2>
      <p className="mx-auto mt-3 max-w-md text-[0.9375rem] leading-relaxed text-muted">{body}</p>
      {children}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink href={primary.href} size="lg">
          {primary.label}
        </ButtonLink>
        {secondary ? (
          <ButtonLink href={secondary.href} variant="outline" size="lg">
            {secondary.label}
          </ButtonLink>
        ) : null}
      </div>
    </div>
  );
}
