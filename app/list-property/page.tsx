import type { Metadata } from 'next';
import { FormShell } from '@/components/forms/FormShell';
import { ListPropertyForm } from './ListPropertyForm';
import { getLocalities } from '@/services/localities';

export const metadata: Metadata = {
  title: 'List your property — pay ₹0 brokerage',
  description:
    'List your Chennai home directly to renters. No brokerage, no broker calls, and your number stays private.',
  alternates: { canonical: '/list-property' },
};

const POINTS = [
  'No brokerage, ever',
  'Your number stays private',
  'Matched to active renters',
];

export default async function ListPropertyPage() {
  const localities = await getLocalities();

  return (
    <FormShell
      eyebrow="Owner direct"
      title={
        <>
          List your property.
          <br />
          Pay ₹0 brokerage.
        </>
      }
      lede="Chennai.rent is owner-direct only. Publish your home in a couple of minutes and talk to renters yourself."
      aside={
        <ul className="space-y-3">
          {POINTS.map((p) => (
            <li key={p} className="flex items-center gap-3 text-sm text-white/75">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-owner">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="m5 12.5 4.5 4.5L19 7.5" stroke="var(--color-ink)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              {p}
            </li>
          ))}
        </ul>
      }
    >
      <ListPropertyForm localities={localities} />
    </FormShell>
  );
}
