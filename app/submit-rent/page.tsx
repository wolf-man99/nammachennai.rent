import type { Metadata } from 'next';
import { FormShell } from '@/components/forms/FormShell';
import { SubmitRentForm } from './SubmitRentForm';
import { getLocalities } from '@/services/localities';
import { getCityIndex } from '@/services/rent-stats';

export const metadata: Metadata = {
  title: 'Submit your rent — help Chennai renters',
  description:
    'Share what you pay anonymously and help other Chennai renters understand the market. No account needed.',
  alternates: { canonical: '/submit-rent' },
};

export default async function SubmitRentPage() {
  const [localities, index] = await Promise.all([getLocalities(), getCityIndex()]);

  return (
    <FormShell
      eyebrow="Rent report"
      title="What are you paying for rent?"
      lede="Share what you pay anonymously and help other Chennai renters understand the market. It takes about a minute and we never ask who you are."
      aside={
        <div className="rounded-panel border border-white/10 bg-white/[0.04] px-7 py-6 backdrop-blur-sm">
          <p className="eyebrow mb-3 text-white/40">Reports so far</p>
          <p className="text-stat font-semibold tabular-nums text-white">
            {index.totalReports.toLocaleString('en-IN')}
          </p>
          <p className="mt-2 text-sm text-white/50">across {index.activeLocalities} localities</p>
        </div>
      }
    >
      <SubmitRentForm localities={localities} />
    </FormShell>
  );
}
