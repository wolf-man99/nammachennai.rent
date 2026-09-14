'use client';

import { useState } from 'react';
import type { Locality } from '@/types';
import { BHK_OPTIONS } from '@/lib/constants';
import {
  Field,
  FormError,
  FormSection,
  LocalityPicker,
  MoneyInput,
  PrivacyNote,
  Segmented,
  TextInput,
} from '@/components/forms/Fields';
import { PhotoUploader } from '@/components/forms/PhotoUploader';
import { UseMyLocation } from '@/components/forms/UseMyLocation';
import { SuccessPanel } from '@/components/forms/FormShell';
import { useSubmit } from '@/components/forms/useSubmit';
import { Button } from '@/components/ui/primitives';

const today = () => new Date().toISOString().slice(0, 10);

export function ToletForm({ localities }: { localities: Locality[] }) {
  const { submit, loading, error, errors, data } = useSubmit<{ id: string }>('/api/tolet');

  const [localitySlug, setLocalitySlug] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [rent, setRent] = useState('');
  const [bhk, setBhk] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [landmark, setLandmark] = useState('');
  const [seenAt, setSeenAt] = useState(today());

  if (data) {
    return (
      <SuccessPanel
        title="Board recorded."
        body="Thank you — offline inventory just became searchable. We will flag it for review if nobody confirms it within a month."
        primary={{ href: '/to-let', label: 'See reported boards' }}
        secondary={{ href: '/map', label: 'Open the rent map' }}
      />
    );
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        await submit({
          locality_slug: localitySlug,
          latitude: coords?.latitude ?? null,
          longitude: coords?.longitude ?? null,
          photo: photos[0] ?? null,
          rent: rent ? Number(rent) : null,
          bhk,
          phone: phone || null,
          landmark: landmark || null,
          seen_at: seenAt,
        });
      }}
      className="card p-6 sm:p-9"
    >
      <FormSection step={1} title="Where did you see it?">
        <Field label="Locality" error={errors.locality_slug}>
          <LocalityPicker localities={localities} value={localitySlug} onChange={setLocalitySlug} error={errors.locality_slug} />
        </Field>
        <Field label="Street or landmark" optional error={errors.landmark}>
          <TextInput
            value={landmark}
            onChange={(e) => setLandmark(e.target.value)}
            placeholder="e.g. opposite the bus depot, 2nd Main Road"
          />
        </Field>
        <UseMyLocation value={coords} onChange={setCoords} />
        <Field label="Date seen" error={errors.seen_at}>
          <TextInput type="date" max={today()} value={seenAt} onChange={(e) => setSeenAt(e.target.value)} />
        </Field>
      </FormSection>

      <FormSection step={2} title="What was on the board?" hint="Whatever you can read — none of it is required.">
        <Field label="Photo of the board" optional>
          <PhotoUploader value={photos} onChange={setPhotos} />
        </Field>
        <Field label="Rent on the board" optional error={errors.rent}>
          <MoneyInput value={rent} onChange={setRent} placeholder="18,000" error={errors.rent} />
        </Field>
        <Field label="Size" optional error={errors.bhk}>
          <Segmented options={BHK_OPTIONS} value={bhk} onChange={setBhk} allowClear />
        </Field>
        <Field label="Phone number on the board" optional error={errors.phone}>
          <TextInput inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98xxxxxxxx" error={errors.phone} />
        </Field>
      </FormSection>

      <div className="mt-8 space-y-4">
        <FormError message={error} />
        <PrivacyNote>
          The number from a board is shown only to renters who identify themselves first, and every
          board is flagged for review once it is a month old.
        </PrivacyNote>
        <Button type="submit" size="lg" disabled={loading} className="w-full">
          {loading ? 'Recording…' : 'Report this board'}
        </Button>
      </div>
    </form>
  );
}
