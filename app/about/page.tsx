import type { Metadata } from 'next';
import { ButtonLink, Container, Eyebrow, SectionHeader } from '@/components/ui/primitives';
import { MIN_SAMPLE, MIN_SAMPLE_INDEXABLE } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'How it works',
  description:
    'How Rent In Chennai collects rent data, what we publish, what we refuse to estimate, and how we handle your privacy.',
  alternates: { canonical: '/about' },
};

const PRINCIPLES = [
  {
    title: 'We never invent a number',
    body: `A median is published only once at least ${MIN_SAMPLE} renters have reported a comparable home. Below that threshold every surface says "not enough renter data yet" — because a confident wrong number is worse than an honest gap.`,
  },
  {
    title: 'Rent reports are anonymous',
    body: 'We do not ask renters for a name, an email or a phone number. Society names are stored but never published, and every map coordinate is deliberately blurred before it leaves the server.',
  },
  {
    title: 'Contact details are never public',
    body: 'An owner’s number is not part of any listing page or public API response. It is released only through a server-side endpoint, after the renter identifies themselves, and every release is rate limited and logged.',
  },
  {
    title: 'Owner-direct only',
    body: 'Rent In Chennai charges no brokerage and lists no broker inventory. Accounts posting like agencies are flagged automatically and reviewed.',
  },
  {
    title: 'Thin pages stay out of search',
    body: `A locality-and-size page is only marked indexable once it carries at least ${MIN_SAMPLE_INDEXABLE} reports. We would rather have fifty useful pages than five thousand empty ones.`,
  },
];

export default function AboutPage() {
  return (
    <Container className="py-10 lg:py-16">
      <Eyebrow>How this works</Eyebrow>
      <h1 className="mt-4 max-w-3xl text-headline font-semibold uppercase tracking-tight">
        Rent data, measured honestly
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
        Rent In Chennai exists because nobody can tell you what rent should cost in Chennai. Portals
        show asking prices; brokers show what suits them. We show what renters say they actually pay.
      </p>

      <section className="mt-14 grid gap-4 lg:grid-cols-2">
        {PRINCIPLES.map((p) => (
          <div key={p.title} className="card p-7">
            <h2 className="text-lg font-semibold tracking-tight">{p.title}</h2>
            <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">{p.body}</p>
          </div>
        ))}
      </section>

      <section className="mt-14 card p-7 sm:p-9">
        <SectionHeader eyebrow="Method" title="How a median gets published" />
        <ol className="space-y-6">
          {[
            'A renter submits their locality, size, rent, maintenance and furnishing — anonymously.',
            'The submission is checked for impossible values, duplicates and bursts from one source.',
            'Clean submissions join the pool for that locality and size.',
            `Once the pool reaches ${MIN_SAMPLE} reports we publish the median, the middle-half range and the full spread.`,
            'Trend compares the last 90 days against the 90 before it, and is shown only when both windows clear the threshold.',
          ].map((step, i) => (
            <li key={i} className="flex gap-5">
              <span className="eyebrow mt-1 shrink-0 text-faint tabular-nums">
                {String(i + 1).padStart(2, '0')}
              </span>
              <p className="text-[0.9375rem] leading-relaxed text-muted">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-12 flex flex-wrap gap-3">
        <ButtonLink href="/submit-rent" size="lg">Submit Your Rent</ButtonLink>
        <ButtonLink href="/map" variant="outline" size="lg">Explore Rent Map</ButtonLink>
      </div>
    </Container>
  );
}
