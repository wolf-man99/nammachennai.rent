'use client';

import { useEffect, useState } from 'react';
import type { Locality, PublicListing } from '@/types';
import { BHK_OPTIONS, FURNISHING_OPTIONS, PROPERTY_TYPE_OPTIONS } from '@/lib/constants';
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
import { UseMyLocation } from '@/components/forms/UseMyLocation';
import { useSubmit } from '@/components/forms/useSubmit';
import { Button, EmptyState, Eyebrow, Pill } from '@/components/ui/primitives';
import { ListingCard } from '@/components/listings/ListingCard';
import { track } from '@/lib/analytics';

interface MatchResult {
  listing: PublicListing;
  score: number;
  distanceKm: number;
  reasons: string[];
}

type Result = { id: string; matches: MatchResult[] };

const RADII = [
  { value: '2', label: '2 km' },
  { value: '5', label: '5 km' },
  { value: '10', label: '10 km' },
  { value: '20', label: '20 km' },
];

export function FindHomeForm({ localities }: { localities: Locality[] }) {
  const { submit, loading, error, errors, data } = useSubmit<Result>('/api/seekers');
  const [started, setStarted] = useState(false);

  const [localitySlug, setLocalitySlug] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [radius, setRadius] = useState<string | null>('5');
  const [bhk, setBhk] = useState<string | null>('2BHK');
  const [maxRent, setMaxRent] = useState('');
  const [furnishing, setFurnishing] = useState<string | null>(null);
  const [propertyType, setPropertyType] = useState<string | null>(null);
  const [moveIn, setMoveIn] = useState('');
  const [roomOrFull, setRoomOrFull] = useState<string | null>('full');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (started) track('seeker_started', {});
  }, [started]);

  if (data) return <MatchResults result={data} />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await submit({
      locality_slug: localitySlug,
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
      radius_km: Number(radius) || 5,
      max_rent: Number(maxRent) || 0,
      bhk,
      furnishing,
      property_type: propertyType,
      move_in_date: moveIn || null,
      room_or_full: roomOrFull,
      contact_name: name,
      contact_phone: phone,
      contact_email: email || undefined,
    });
  }

  return (
    <form onSubmit={onSubmit} onFocus={() => setStarted(true)} className="card p-6 sm:p-9">
      <FormSection step={1} title="Where are you looking?">
        <Field label="Locality" error={errors.locality_slug}>
          <LocalityPicker localities={localities} value={localitySlug} onChange={setLocalitySlug} error={errors.locality_slug} />
        </Field>
        <Field label="How far will you go?" error={errors.radius_km}>
          <Segmented options={RADII} value={radius} onChange={setRadius} />
        </Field>
        <UseMyLocation value={coords} onChange={setCoords} />
      </FormSection>

      <FormSection step={2} title="What do you need?">
        <Field label="Size" error={errors.bhk}>
          <Segmented options={BHK_OPTIONS} value={bhk} onChange={setBhk} />
        </Field>
        <Field label="Whole flat or a room?" error={errors.room_or_full}>
          <Segmented
            options={[
              { value: 'full', label: 'Whole flat' },
              { value: 'room', label: 'A room' },
            ]}
            value={roomOrFull}
            onChange={setRoomOrFull}
          />
        </Field>
        <Field label="Maximum rent" error={errors.max_rent}>
          <MoneyInput value={maxRent} onChange={setMaxRent} placeholder="30,000" error={errors.max_rent} />
        </Field>
        <Field label="Furnishing" optional>
          <Segmented options={FURNISHING_OPTIONS} value={furnishing} onChange={setFurnishing} allowClear />
        </Field>
        <Field label="Property type" optional>
          <Segmented options={PROPERTY_TYPE_OPTIONS} value={propertyType} onChange={setPropertyType} allowClear />
        </Field>
        <Field label="Move-in date" optional error={errors.move_in_date}>
          <TextInput type="date" value={moveIn} onChange={(e) => setMoveIn(e.target.value)} />
        </Field>
      </FormSection>

      <FormSection step={3} title="Where should owners reach you?" hint="Only owners of homes you contact will see this.">
        <Field label="Your name" error={errors.contact_name}>
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" error={errors.contact_name} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Phone" error={errors.contact_phone}>
            <TextInput inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98xxxxxxxx" error={errors.contact_phone} />
          </Field>
          <Field label="Email" optional error={errors.contact_email}>
            <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </Field>
        </div>
      </FormSection>

      <div className="mt-8 space-y-4">
        <FormError message={error} />
        <PrivacyNote>
          We never sell requirements to brokers. Your details stay with Rent In Chennai and the owners
          you choose to contact.
        </PrivacyNote>
        <Button type="submit" size="lg" disabled={loading} className="w-full">
          {loading ? 'Matching…' : 'Find my matches'}
        </Button>
      </div>
    </form>
  );
}

function MatchResults({ result }: { result: Result }) {
  return (
    <div className="animate-rise space-y-6">
      <div className="card p-7 sm:p-9">
        <Eyebrow>Your requirement is saved</Eyebrow>
        <h2 className="mt-4 text-title font-semibold tracking-tight">
          {result.matches.length
            ? `${result.matches.length} owner ${result.matches.length === 1 ? 'home' : 'homes'} match right now`
            : 'No matches yet — you are first in the queue'}
        </h2>
        <p className="mt-3 max-w-xl text-[0.9375rem] leading-relaxed text-muted">
          {result.matches.length
            ? 'Ranked by distance, budget fit, size and how recently each home was listed. Contact any owner directly — there is no brokerage.'
            : 'We have stored what you need and will match it against every new owner listing as it arrives.'}
        </p>
      </div>

      {result.matches.length ? (
        <div className="grid gap-5 sm:grid-cols-2">
          {result.matches.map((m) => (
            <div key={m.listing.id} className="flex flex-col gap-3">
              <ListingCard listing={m.listing} />
              <div className="flex flex-wrap items-center gap-2 px-1">
                <Pill tone="data">{m.score}% match</Pill>
                <Pill tone="neutral">{m.distanceKm} km away</Pill>
                {m.reasons.slice(0, 1).map((r) => (
                  <span key={r} className="text-xs text-faint">
                    {r}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Nothing matches yet"
          body="Rent In Chennai is owner-direct, so supply builds locality by locality. Meanwhile, see what renters nearby are paying."
          cta={{ href: '/map', label: 'Open the rent map' }}
        />
      )}
    </div>
  );
}
