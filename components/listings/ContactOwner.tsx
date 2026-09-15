'use client';

import { useState } from 'react';
import { Button, Pill } from '@/components/ui/primitives';
import { Field, FormError, TextInput } from '@/components/forms/Fields';
import { useSubmit } from '@/components/forms/useSubmit';
import { track } from '@/lib/analytics';

interface Contact {
  owner_name?: string | null;
  phone: string;
  whatsapp: string;
}

/**
 * Contact details are fetched, never rendered into the page.
 *
 * The renter identifies themselves first; the server rate limits and logs each
 * reveal. Nothing about the owner reaches the client until this call succeeds.
 */
export function ContactOwner({
  endpoint,
  label = 'Contact owner',
  title = 'Talk to the owner directly',
  blurb = 'No brokerage, no middleman. Share your name and number and we will show you theirs.',
}: {
  endpoint: string;
  label?: string;
  title?: string;
  blurb?: string;
}) {
  const { submit, loading, error, errors, data } = useSubmit<Contact>(endpoint);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  if (data) {
    return (
      <div className="rounded-panel border border-owner-ink/20 bg-owner-soft p-6">
        <Pill tone="owner">Owner direct</Pill>
        {data.owner_name ? (
          <p className="mt-4 text-lg font-semibold tracking-tight">{data.owner_name}</p>
        ) : null}
        <a
          href={`tel:+91${data.phone}`}
          className="mt-1 block text-stat font-semibold tabular-nums tracking-tight text-ink"
        >
          {data.phone}
        </a>
        <div className="mt-5 flex flex-wrap gap-2.5">
          <a
            href={data.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center rounded-pill bg-ink px-5 text-[0.9375rem] font-semibold text-white transition-colors hover:bg-ink-soft"
          >
            Message on WhatsApp
          </a>
          <a
            href={`tel:+91${data.phone}`}
            className="inline-flex h-11 items-center rounded-pill border border-ink/20 px-5 text-[0.9375rem] font-semibold transition-colors hover:border-ink"
          >
            Call
          </a>
        </div>
        <p className="mt-4 text-xs text-ink/55">
          Mention Rent In Chennai when you call. If anyone asks you for brokerage, report the listing.
        </p>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="rounded-panel border border-line bg-surface-sunk p-6">
        <p className="text-lg font-semibold tracking-tight">{title}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{blurb}</p>
        <Button
          size="lg"
          className="mt-5 w-full"
          onClick={() => {
            track('contact_owner', { step: 'open' });
            setOpen(true);
          }}
        >
          {label}
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        await submit({ name, phone });
      }}
      className="rounded-panel border border-line bg-surface-sunk p-6"
    >
      <p className="text-lg font-semibold tracking-tight">{title}</p>
      <div className="mt-5 space-y-4">
        <Field label="Your name" error={errors.name}>
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" error={errors.name} autoFocus />
        </Field>
        <Field label="Your phone" error={errors.phone}>
          <TextInput
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="98xxxxxxxx"
            error={errors.phone}
          />
        </Field>
        <FormError message={error} />
        <Button type="submit" size="lg" disabled={loading} className="w-full">
          {loading ? 'Getting details…' : 'Show contact details'}
        </Button>
        <p className="text-xs leading-relaxed text-faint">
          We share your name and number with this owner only. We never pass it to brokers or list it
          publicly.
        </p>
      </div>
    </form>
  );
}
