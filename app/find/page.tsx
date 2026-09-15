import type { Metadata } from 'next';
import { FormShell } from '@/components/forms/FormShell';
import { FindHomeForm } from './FindHomeForm';
import { getLocalities } from '@/services/localities';
import { getCityIndex } from '@/services/rent-stats';

export const metadata: Metadata = {
  title: 'Find a home in Chennai — owner direct',
  description:
    'Tell us the locality, size and budget you need. We match your requirement against every owner-direct home on Rent In Chennai.',
  alternates: { canonical: '/find' },
};

export default async function FindPage() {
  const [localities, index] = await Promise.all([getLocalities(), getCityIndex()]);

  return (
    <FormShell
      eyebrow="Find a home"
      title="Tell us what you need. We do the looking."
      lede="Describe the home you want once. We match it against every owner-direct listing on Rent In Chennai, now and as new ones arrive."
      aside={
        <div className="rounded-panel border border-white/10 bg-white/[0.04] px-7 py-6 backdrop-blur-sm">
          <p className="eyebrow mb-3 text-white/40">Owner homes live</p>
          <p className="text-stat font-semibold tabular-nums text-white">
            {index.activeListings.toLocaleString('en-IN')}
          </p>
          <p className="mt-2 text-sm text-white/50">zero brokerage, always</p>
        </div>
      }
    >
      <FindHomeForm localities={localities} />
    </FormShell>
  );
}
