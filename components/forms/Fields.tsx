'use client';

import { useId, useMemo, useState, type ReactNode } from 'react';
import type { Locality } from '@/types';

/**
 * Form primitives.
 *
 * Every input is large, rounded and labelled above the field; choices with five
 * or fewer options become segmented controls so most forms are taps, not typing.
 */

export function FormSection({
  step,
  title,
  hint,
  children,
}: {
  step?: number;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-line py-8 first:border-t-0 first:pt-0">
      <div className="mb-6 flex items-baseline gap-3">
        {step !== undefined ? (
          <span className="eyebrow text-faint tabular-nums">{String(step).padStart(2, '0')}</span>
        ) : null}
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          {hint ? <p className="mt-1 text-sm text-muted">{hint}</p> : null}
        </div>
      </div>
      <div className="grid gap-5">{children}</div>
    </section>
  );
}

export function Field({
  label,
  hint,
  error,
  optional,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-sm font-semibold tracking-tight">
          {label}
          {optional ? <span className="ml-1.5 font-normal text-faint">optional</span> : null}
        </label>
        {hint ? <span className="text-xs text-faint">{hint}</span> : null}
      </div>
      {children}
      {error ? (
        <p className="mt-2 text-xs font-medium text-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextInput({
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { error?: string }) {
  return <input {...props} className={`field ${error ? 'border-error' : ''} ${props.className ?? ''}`} />;
}

export function TextArea({
  error,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: string }) {
  return (
    <textarea
      {...props}
      className={`field min-h-28 resize-y ${error ? 'border-error' : ''} ${props.className ?? ''}`}
    />
  );
}

/** Money fields carry a ₹ so the unit is never in doubt. */
export function MoneyInput({
  value,
  onChange,
  error,
  placeholder,
  id,
  suffix = '/month',
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
  id?: string;
  suffix?: string | null;
}) {
  const formatted = useMemo(() => {
    const n = Number(value);
    return value && Number.isFinite(n) && n > 0 ? n.toLocaleString('en-IN') : '';
  }, [value]);

  return (
    <div
      className={`flex items-center rounded-field border bg-surface transition-all duration-200 focus-within:border-ink focus-within:shadow-[0_0_0_3px_rgb(20_20_20/0.08)] ${
        error ? 'border-error' : 'border-line-strong'
      }`}
    >
      <span className="pl-4 text-lg font-medium text-muted">₹</span>
      <input
        id={id}
        size={1}
        inputMode="numeric"
        value={formatted}
        onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ''))}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent px-2.5 py-3.5 text-lg tabular-nums outline-none placeholder:text-faint placeholder:text-base"
      />
      {suffix ? <span className="pr-4 text-sm text-faint">{suffix}</span> : null}
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  allowClear = false,
  size = 'md',
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T | null) => void;
  allowClear?: boolean;
  size?: 'sm' | 'md';
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active && allowClear ? null : o.value)}
            className={`rounded-pill border font-medium tracking-tight transition-all duration-200 ease-[var(--ease-out-soft)] active:scale-[0.97] ${
              size === 'sm' ? 'px-3.5 py-1.5 text-xs' : 'px-4 py-2.5 text-[0.9375rem]'
            } ${
              active
                ? 'border-ink bg-ink text-white'
                : 'border-line-strong bg-surface text-muted hover:border-ink hover:text-ink'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function MultiSelect<T extends string>({
  options,
  value,
  onChange,
  size = 'sm',
}: {
  options: { value: T; label: string }[];
  value: T[];
  onChange: (v: T[]) => void;
  size?: 'sm' | 'md';
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group">
      {options.map((o) => {
        const active = value.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active ? value.filter((v) => v !== o.value) : [...value, o.value])}
            className={`rounded-pill border font-medium tracking-tight transition-all duration-200 active:scale-[0.97] ${
              size === 'sm' ? 'px-3.5 py-1.5 text-xs' : 'px-4 py-2.5 text-[0.9375rem]'
            } ${
              active
                ? 'border-ink bg-ink text-white'
                : 'border-line-strong bg-surface text-muted hover:border-ink hover:text-ink'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Searchable locality select. Typing filters; nothing is free text, so data stays clean. */
export function LocalityPicker({
  localities,
  value,
  onChange,
  error,
  placeholder = 'Search your locality',
}: {
  localities: Pick<Locality, 'id' | 'name' | 'slug' | 'zone' | 'tier'>[];
  value: string | null;
  onChange: (slug: string | null) => void;
  error?: string;
  placeholder?: string;
}) {
  const id = useId();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const selected = localities.find((l) => l.slug === value) ?? null;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return localities.slice(0, 40);
    return localities
      .filter((l) => l.name.toLowerCase().includes(q) || (l.zone ?? '').toLowerCase().includes(q))
      .slice(0, 40);
  }, [localities, query]);

  if (selected && !open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setQuery('');
        }}
        className="flex w-full items-center justify-between rounded-field border border-line-strong bg-surface px-4 py-3.5 text-left transition-colors hover:border-ink"
      >
        <span>
          <span className="font-medium">{selected.name}</span>
          <span className="ml-2 text-sm text-faint">{selected.zone}</span>
        </span>
        <span className="text-xs font-semibold text-muted">Change</span>
      </button>
    );
  }

  return (
    <div>
      <input
        id={id}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        className={`field ${error ? 'border-error' : ''}`}
      />
      <div className="mt-2 max-h-56 overflow-y-auto rounded-panel border border-line bg-surface p-1.5">
        {results.length ? (
          results.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => {
                onChange(l.slug);
                setOpen(false);
                setQuery('');
              }}
              className="flex w-full items-center justify-between rounded-field px-3 py-2.5 text-left text-sm transition-colors hover:bg-ground"
            >
              <span className="font-medium">{l.name}</span>
              <span className="text-xs text-faint">{l.zone}</span>
            </button>
          ))
        ) : (
          <p className="px-3 py-4 text-sm text-muted">
            No Chennai locality matches that yet. Try a nearby area.
          </p>
        )}
      </div>
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="rounded-field border border-error/30 bg-error-soft px-4 py-3 text-sm font-medium text-error" role="alert">
      {message}
    </div>
  );
}

export function PrivacyNote({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2.5 rounded-field bg-surface-sunk px-4 py-3 text-xs leading-relaxed text-muted">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0 text-faint" aria-hidden="true">
        <path d="M12 3 5 6v5.5c0 4.2 2.9 8.1 7 9.5 4.1-1.4 7-5.3 7-9.5V6z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
      <span>{children}</span>
    </p>
  );
}
