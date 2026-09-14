'use client';

import { useEffect, useState } from 'react';
import type { Locality } from '@/types';
import {
  BHK_OPTIONS,
  FURNISHING_OPTIONS,
  PARKING_OPTIONS,
  PROPERTY_TYPE_OPTIONS,
} from '@/lib/constants';
import {
  Field,
  FormError,
  FormSection,
  LocalityPicker,
  MoneyInput,
  PrivacyNote,
  Segmented,
  TextArea,
  TextInput,
} from '@/components/forms/Fields';
import { SuccessPanel } from '@/components/forms/FormShell';
import { useSubmit } from '@/components/forms/useSubmit';
import { Button } from '@/components/ui/primitives';
import { track } from '@/lib/analytics';
import { UseMyLocation } from '@/components/forms/UseMyLocation';

type Result = { id: string; locality: { name: string; slug: string } };

export function SubmitRentForm({ localities }: { localities: Locality[] }) {
  const { submit, loading, error, errors, data } = useSubmit<Result>('/api/rent-submissions');
  const [started, setStarted] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const [localitySlug, setLocalitySlug] = useState<string | null>(null);
  const [bhk, setBhk] = useState<string | null>('2BHK');
  const [propertyType, setPropertyType] = useState<string | null>('apartment');
  const [rent, setRent] = useState('');
  const [maintenance, setMaintenance] = useState('');
  const [furnishing, setFurnishing] = useState<string | null>('semi_furnished');
  const [floor, setFloor] = useState('');
  const [parking, setParking] = useState<string | null>(null);
  const [society, setSociety] = useState('');
  const [moveIn, setMoveIn] = useState('');
  const [comments, setComments] = useState('');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    if (started) track('rent_submission_started', {});
  }, [started]);

  if (data) {
    return (
      <SuccessPanel
        title="Thank you."
        body="Your data is helping make Chennai's rental market more transparent."
        primary={{ href: `/chennai/${data.locality.slug}`, label: 'See rent around you' }}
        secondary={{ href: '/map', label: 'Open the rent map' }}
      />
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await submit({
      locality_slug: localitySlug,
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
      bhk,
      property_type: propertyType,
      rent: Number(rent) || 0,
      maintenance: maintenance ? Number(maintenance) : null,
      furnishing,
      floor: floor ? Number(floor) : null,
      parking,
      society: society || null,
      move_in_date: moveIn || null,
      comments: comments || null,
    });
  }

  return (
    <form onSubmit={onSubmit} onFocus={() => setStarted(true)} className="card p-6 sm:p-9">
      <FormSection step={1} title="Where do you live?" hint="Pick the locality closest to your home.">
        <Field label="Locality" error={errors.locality_slug}>
          <LocalityPicker
            localities={localities}
            value={localitySlug}
            onChange={setLocalitySlug}
            error={errors.locality_slug}
          />
        </Field>
        <UseMyLocation value={coords} onChange={setCoords} />
      </FormSection>

      <FormSection step={2} title="What are you renting?">
        <Field label="Size" error={errors.bhk}>
          <Segmented options={BHK_OPTIONS} value={bhk} onChange={setBhk} />
        </Field>
        <Field label="Property type" error={errors.property_type}>
          <Segmented options={PROPERTY_TYPE_OPTIONS} value={propertyType} onChange={setPropertyType} />
        </Field>
        <Field label="Furnishing" error={errors.furnishing}>
          <Segmented options={FURNISHING_OPTIONS} value={furnishing} onChange={setFurnishing} />
        </Field>
      </FormSection>

      <FormSection step={3} title="What do you pay?" hint="Rent only — add maintenance separately.">
        <Field label="Monthly rent" error={errors.rent}>
          <MoneyInput value={rent} onChange={setRent} placeholder="24,500" error={errors.rent} />
        </Field>
        <Field label="Maintenance" optional error={errors.maintenance} hint="per month">
          <MoneyInput value={maintenance} onChange={setMaintenance} placeholder="2,500" suffix={null} />
        </Field>
      </FormSection>

      {expanded ? (
        <FormSection step={4} title="A little more detail" hint="All optional — it sharpens the data.">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Floor" optional error={errors.floor}>
              <TextInput
                inputMode="numeric"
                value={floor}
                onChange={(e) => setFloor(e.target.value.replace(/[^\d-]/g, ''))}
                placeholder="3"
              />
            </Field>
            <Field label="Moved in" optional error={errors.move_in_date}>
              <TextInput type="date" value={moveIn} onChange={(e) => setMoveIn(e.target.value)} />
            </Field>
          </div>
          <Field label="Parking" optional>
            <Segmented options={PARKING_OPTIONS} value={parking} onChange={setParking} allowClear />
          </Field>
          <Field label="Society or building" optional hint="Never shown publicly">
            <TextInput value={society} onChange={(e) => setSociety(e.target.value)} placeholder="e.g. Casagrand Bloom" />
          </Field>
          <Field label="Anything worth knowing?" optional>
            <TextArea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Rent went up 8% at renewal, water is tanker-supplied in summer…"
              maxLength={500}
            />
          </Field>
        </FormSection>
      ) : (
        <div className="border-t border-line pt-6">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="text-sm font-semibold text-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
          >
            + Add floor, parking and other details
          </button>
        </div>
      )}

      <div className="mt-8 space-y-4">
        <FormError message={error} />
        <PrivacyNote>
          Submitted anonymously. We never ask for your name, phone or flat number, and the map shows
          an approximate location only.
        </PrivacyNote>
        <Button type="submit" size="lg" disabled={loading} className="w-full">
          {loading ? 'Submitting…' : 'Submit my rent'}
        </Button>
      </div>
    </form>
  );
}
