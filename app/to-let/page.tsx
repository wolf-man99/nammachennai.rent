import type { Metadata } from 'next';
import { ButtonLink, Container, EmptyState, Eyebrow, Stat } from '@/components/ui/primitives';
import { ToletCard } from '@/components/listings/ToletCard';
import { getToletReports } from '@/services/tolet';

export const revalidate = 120;

export const metadata: Metadata = {
  title: 'To-Let boards in Chennai, mapped',
  description:
    'Chennai rentals still live on physical To-Let boards. Report one you walked past and it becomes searchable for everyone.',
  alternates: { canonical: '/to-let' },
};

export default async function ToletPage() {
  const reports = await getToletReports({ limit: 60 });
  const withPhone = reports.filter((r) => r.has_phone).length;

  return (
    <>
      <section className="px-3 pt-3 sm:px-5 lg:px-8 lg:pt-4">
        <div className="relative overflow-hidden rounded-[32px] bg-ink px-6 pb-14 pt-12 text-white sm:px-10 sm:pt-16 lg:px-16">
          <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-28 h-[360px] w-[360px] rounded-full bg-tolet/25 blur-[120px]" />
          <div className="relative grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:items-end">
            <div>
              <Eyebrow className="text-owner">To-Let</Eyebrow>
              <h1 className="mt-6 max-w-2xl text-headline font-semibold uppercase">
                Chennai&apos;s rental market still lives on boards
              </h1>
              <p className="mt-5 max-w-lg text-[0.9375rem] leading-relaxed text-white/60">
                Most homes here never reach a website. Photograph a To-Let board you walk past and it
                becomes searchable for every renter after you.
              </p>
              <ButtonLink href="/to-let/new" variant="accent" size="lg" className="mt-8">
                Report a To-Let board
              </ButtonLink>
            </div>
            <div className="flex gap-12">
              <Stat label="Boards reported" value={reports.length.toLocaleString('en-IN')} tone="light" />
              <Stat label="With a number" value={withPhone.toLocaleString('en-IN')} tone="light" />
            </div>
          </div>
        </div>
      </section>

      <Container className="mt-12">
        {reports.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {reports.map((r) => (
              <ToletCard key={r.id} report={r} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No boards reported yet"
            body="Next time you pass a To-Let board in Chennai, take ten seconds to report it. It is the fastest way to grow real inventory."
            cta={{ href: '/to-let/new', label: 'Report a board' }}
          />
        )}
      </Container>
    </>
  );
}
