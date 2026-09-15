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
import { PhotoUploader } from '@/components/forms/PhotoUploader';
import { UseMyLocation } from '@/components/forms/UseMyLocation';
import { SuccessPanel } from '@/components/forms/FormShell';
import { useSubmit } from '@/components/forms/useSubmit';
import { Button } from '@/components/ui/primitives';
import { track } from '@/lib/analytics';
import { DashboardLink } from './DashboardLink';

export function ListPropertyForm({ localities }: { localities: Locality[] }) {
  const { submit, loading, error, errors, data } = useSubmit<{ id: string; manageToken: string | null }>(
    '/api/listings',
  );
  const [started, setStarted] = useState(false);

  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [localitySlug, setLocalitySlug] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [propertyType, setPropertyType] = useState<string | null>('apartment');
  const [bhk, setBhk] = useState<string | null>('2BHK');
  const [rent, setRent] = useState('');
  const [maintenance, setMaintenance] = useState('');
  const [deposit, setDeposit] = useState('');
  const [furnishing, setFurnishing] = useState<string | null>('semi_furnished');
  const [parking, setParking] = useState<string | null>(null);
  const [area, setArea] = useState('');
  const [availableFrom, setAvailableFrom] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  useEffect(() => {
    if (started) track('listing_started', {});
  }, [started]);

  if (data) {
    return (
      <SuccessPanel
        title="Your home is live."
        body="Renters can see it now. Your number stays private — we pass it on only when someone asks to contact you, and never to brokers."
        primary={{ href: `/property/${data.id}`, label: 'View your listing' }}
        secondary={{ href: '/listings', label: 'See other homes' }}
      >
        {data.manageToken ? <DashboardLink token={data.manageToken} /> : null}
      </SuccessPanel>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await submit({
      owner_name: ownerName,
      owner_phone: phone,
      owner_email: email || undefined,
      locality_slug: localitySlug,
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
      property_type: propertyType,
      bhk,
      rent: Number(rent) || 0,
      maintenance: maintenance ? Number(maintenance) : null,
      deposit: deposit ? Number(deposit) : null,
      furnishing,
      parking,
      area_sqft: area ? Number(area) : null,
      available_from: availableFrom || null,
      title: title || null,
      description: description || null,
      photos,
    });
  }

  return (
    <form onSubmit={onSubmit} onFocus={() => setStarted(true)} className="card p-6 sm:p-9">
      <FormSection step={1} title="The home" hint="Where it is and what it is.">
        <Field label="Locality" error={errors.locality_slug}>
          <LocalityPicker localities={localities} value={localitySlug} onChange={setLocalitySlug} error={errors.locality_slug} />
        </Field>
        <UseMyLocation value={coords} onChange={setCoords} />
        <Field label="Size" error={errors.bhk}>
          <Segmented options={BHK_OPTIONS} value={bhk} onChange={setBhk} />
        </Field>
        <Field label="Property type" error={errors.property_type}>
          <Segmented options={PROPERTY_TYPE_OPTIONS} value={propertyType} onChange={setPropertyType} />
        </Field>
        <Field label="Furnishing" error={errors.furnishing}>
          <Segmented options={FURNISHING_OPTIONS} value={furnishing} onChange={setFurnishing} />
        </Field>
        <Field label="Parking" optional>
          <Segmented options={PARKING_OPTIONS} value={parking} onChange={setParking} allowClear />
        </Field>
      </FormSection>

      <FormSection step={2} title="The numbers">
        <Field label="Monthly rent" error={errors.rent}>
          <MoneyInput value={rent} onChange={setRent} placeholder="28,000" error={errors.rent} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Deposit" optional error={errors.deposit}>
            <MoneyInput value={deposit} onChange={setDeposit} placeholder="1,00,000" suffix={null} />
          </Field>
          <Field label="Maintenance" optional error={errors.maintenance} hint="per month">
            <MoneyInput value={maintenance} onChange={setMaintenance} placeholder="2,500" suffix={null} />
          </Field>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Built-up area" optional hint="sq ft" error={errors.area_sqft}>
            <TextInput
              inputMode="numeric"
              value={area}
              onChange={(e) => setArea(e.target.value.replace(/[^\d]/g, ''))}
              placeholder="1150"
            />
          </Field>
          <Field label="Available from" optional error={errors.available_from}>
            <TextInput type="date" value={availableFrom} onChange={(e) => setAvailableFrom(e.target.value)} />
          </Field>
        </div>
      </FormSection>

      <FormSection step={3} title="Photos and description" hint="Optional, but they decide whether renters call.">
        <Field label="Photos" optional>
          <PhotoUploader value={photos} onChange={setPhotos} />
        </Field>
        <Field label="Headline" optional error={errors.title}>
          <TextInput
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Bright 2 BHK with balcony, walk to the IT park"
            maxLength={90}
          />
        </Field>
        <Field label="Description" optional error={errors.description}>
          <TextArea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Two bedrooms, covered car park, 24×7 water, gated community with a lift…"
            maxLength={1500}
          />
        </Field>
      </FormSection>

      <FormSection step={4} title="How renters reach you" hint="Shown only after a renter identifies themselves.">
        <Field label="Your name" error={errors.owner_name}>
          <TextInput value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Full name" error={errors.owner_name} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Phone" error={errors.owner_phone}>
            <TextInput
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="98xxxxxxxx"
              error={errors.owner_phone}
            />
          </Field>
          <Field label="Email" optional error={errors.owner_email}>
            <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </Field>
        </div>
      </FormSection>

      <div className="mt-8 space-y-4">
        <FormError message={error} />
        <PrivacyNote>
          Your phone number is never published on the listing page or in our public API. Renters see
          it only after they identify themselves, and every reveal is logged and rate limited.
        </PrivacyNote>
        <Button type="submit" size="lg" disabled={loading} className="w-full">
          {loading ? 'Publishing…' : 'Publish my listing'}
        </Button>
      </div>
    </form>
  );
}
