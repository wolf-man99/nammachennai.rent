import type { Metadata } from 'next';
import { FormShell } from '@/components/forms/FormShell';
import { ToletForm } from './ToletForm';
import { getLocalities } from '@/services/localities';

export const metadata: Metadata = {
  title: 'Report a To-Let board in Chennai',
  description:
    'Photograph a To-Let board you walked past and turn offline rental inventory into something every Chennai renter can search.',
  alternates: { canonical: '/to-let/new' },
};

export default async function NewToletPage() {
  const localities = await getLocalities();
  return (
    <FormShell
      eyebrow="To-Let"
      title="Saw a board? Ten seconds is all it takes."
      lede="Most Chennai homes are advertised on a board and nowhere else. Report one and it becomes searchable for every renter who comes after you."
    >
      <ToletForm localities={localities} />
    </FormShell>
  );
}
