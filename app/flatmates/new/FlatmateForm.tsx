'use client';

import { useState } from 'react';
import type { Locality } from '@/types';
import { BHK_OPTIONS, FURNISHING_OPTIONS, GENDER_OPTIONS, ROOM_TYPE_OPTIONS } from '@/lib/constants';
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

export function FlatmateForm({ localities }: { localities: Locality[] }) {
  const { submit, loading, error, errors, data } = useSubmit<{ id: string }>('/api/flatmates');

  const [localitySlug, setLocalitySlug] = useState<string | null>(null);
  const [rent, setRent] = useState('');
  const [roomType, setRoomType] = useState<string | null>('private_room');
  const [totalBhk, setTotalBhk] = useState<string | null>('2BHK');
  const [gender, setGender] = useState<string | null>('any');
  const [furnishing, setFurnishing] = useState<string | null>('semi_furnished');
  const [moveIn, setMoveIn] = useState('');
  const [description, setDescription] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  if (data) {
    return (
      <SuccessPanel
        title="Your room is live."
        body="People looking for a flatmate can find it now. Your number stays private until someone identifies themselves."
        primary={{ href: '/flatmates', label: 'See all rooms' }}
        secondary={{ href: '/submit-rent', label: 'Submit your rent' }}
      />
    );
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        await submit({
          locality_slug: localitySlug,
          rent: Number(rent) || 0,
          room_type: roomType,
          total_bhk: totalBhk,
          gender_preference: gender,
          furnishing,
          move_in_date: moveIn || null,
          description: description || null,
          contact_name: name,
          contact_phone: phone,
          contact_email: email || undefined,
        });
      }}
      className="card p-6 sm:p-9"
    >
      <FormSection step={1} title="The room">
        <Field label="Locality" error={errors.locality_slug}>
          <LocalityPicker localities={localities} value={localitySlug} onChange={setLocalitySlug} error={errors.locality_slug} />
        </Field>
        <Field label="What is on offer?" error={errors.room_type}>
          <Segmented options={ROOM_TYPE_OPTIONS} value={roomType} onChange={setRoomType} />
        </Field>
        <Field label="Inside a" error={errors.total_bhk}>
          <Segmented options={BHK_OPTIONS} value={totalBhk} onChange={setTotalBhk} />
        </Field>
        <Field label="Furnishing" error={errors.furnishing}>
          <Segmented options={FURNISHING_OPTIONS} value={furnishing} onChange={setFurnishing} />
        </Field>
      </FormSection>

      <FormSection step={2} title="Rent and timing">
        <Field label="Rent per person" error={errors.rent}>
          <MoneyInput value={rent} onChange={setRent} placeholder="12,000" error={errors.rent} />
        </Field>
        <Field label="Available from" optional error={errors.move_in_date}>
          <TextInput type="date" value={moveIn} onChange={(e) => setMoveIn(e.target.value)} />
        </Field>
        <Field label="Looking for" error={errors.gender_preference}>
          <Segmented options={GENDER_OPTIONS} value={gender} onChange={setGender} />
        </Field>
        <Field label="Tell people about the place" optional error={errors.description}>
          <TextArea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Third floor, working professionals, walk to the bus stop, no restrictions on timing…"
            maxLength={1000}
          />
        </Field>
      </FormSection>

      <FormSection step={3} title="How people reach you">
        <Field label="Your name" error={errors.contact_name}>
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="First name is fine" error={errors.contact_name} />
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
          Your number is never shown on the listing. Someone has to give their own name and number
          before we pass yours on.
        </PrivacyNote>
        <Button type="submit" size="lg" disabled={loading} className="w-full">
          {loading ? 'Posting…' : 'Post this room'}
        </Button>
      </div>
    </form>
  );
}
