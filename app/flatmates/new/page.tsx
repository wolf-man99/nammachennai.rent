import type { Metadata } from 'next';
import { FormShell } from '@/components/forms/FormShell';
import { FlatmateForm } from './FlatmateForm';
import { getLocalities } from '@/services/localities';

export const metadata: Metadata = {
  title: 'Post a room or find a flatmate in Chennai',
  description: 'List a spare room or a shared flat in Chennai. Your contact details stay private.',
  alternates: { canonical: '/flatmates/new' },
};

export default async function NewFlatmatePage() {
  const localities = await getLocalities();
  return (
    <FormShell
      eyebrow="Flatmates"
      title="Post a room. Find the right flatmate."
      lede="Describe the room, the flat and who would fit. People reach out through us, so your number stays yours until you want to share it."
    >
      <FlatmateForm localities={localities} />
    </FormShell>
  );
}
