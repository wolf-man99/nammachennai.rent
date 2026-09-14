'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Locality } from '@/types';
import { BHK_SLUGS } from '@/lib/constants';
import { parseSearch } from '@/lib/search-query';
import { track } from '@/lib/analytics';

/**
 * The single search field the whole product hangs off.
 *
 * It parses "2 BHK OMR under 30k" locally, matches localities against a list
 * loaded once, and routes straight to the right intelligence page.
 */
export function LocalitySearch({
  localities,
  tone = 'light',
  placeholder = 'Search Chennai locality, area or BHK',
  autoFocus = false,
}: {
  localities: Pick<Locality, 'id' | 'name' | 'slug' | 'zone' | 'tier'>[];
  tone?: 'light' | 'dark';
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const parsed = useMemo(() => parseSearch(value), [value]);

  const results = useMemo(() => {
    const q = parsed.text.toLowerCase();
    const pool = localities;
    if (!q) return pool.filter((l) => l.tier === 1).slice(0, 6);
    return pool
      .map((l) => {
        const name = l.name.toLowerCase();
        const zone = (l.zone ?? '').toLowerCase();
        let score = 0;
        if (name === q) score = 100;
        else if (name.startsWith(q)) score = 80;
        else if (name.includes(q)) score = 60;
        else if (zone.startsWith(q)) score = 50;
        else if (zone.includes(q)) score = 35;
        return { l, score: score - l.tier };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((r) => r.l);
  }, [localities, parsed.text]);

  useEffect(() => setHighlight(0), [value]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function go(slug: string) {
    track('locality_search', { query: value, slug, bhk: parsed.bhk ?? '' });
    const bhkSegment = parsed.bhk ? `/${BHK_SLUGS[parsed.bhk]}` : '';
    setOpen(false);
    router.push(`/chennai/${slug}${bhkSegment}`);
  }

  function submit() {
    if (results[highlight]) return go(results[highlight].slug);
    const params = new URLSearchParams();
    if (parsed.text) params.set('q', parsed.text);
    if (parsed.bhk) params.set('bhk', parsed.bhk);
    if (parsed.maxRent) params.set('maxRent', String(parsed.maxRent));
    track('locality_search', { query: value, slug: '', bhk: parsed.bhk ?? '' });
    router.push(`/explore?${params.toString()}`);
  }

  const dark = tone === 'dark';

  return (
    <div ref={wrapRef} className="relative w-full">
      <div
        className={`flex w-full items-center gap-2.5 rounded-pill border p-2 pl-4 transition-all duration-200 sm:gap-3 sm:pl-6 ${
          dark ? 'border-white/15 bg-white/5' : 'border-line bg-surface shadow-[0_10px_40px_rgb(20_20_20/0.08)]'
        }`}
      >
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true" className={dark ? 'text-white/40' : 'text-faint'}>
          <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
          <path d="m16 16 4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>

        <input
          size={1}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setHighlight((h) => Math.min(results.length - 1, h + 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setHighlight((h) => Math.max(0, h - 1));
            } else if (e.key === 'Enter') {
              e.preventDefault();
              submit();
            } else if (e.key === 'Escape') {
              setOpen(false);
            }
          }}
          placeholder={placeholder}
          autoFocus={autoFocus}
          aria-label="Search Chennai locality, area or BHK"
          role="combobox"
          aria-expanded={open}
          aria-controls="locality-search-results"
          className={`h-12 min-w-0 flex-1 bg-transparent text-base outline-none sm:text-lg ${
            dark ? 'text-white placeholder:text-white/35' : 'text-ink placeholder:text-faint'
          }`}
        />

        <button
          type="button"
          onClick={submit}
          className={`h-12 shrink-0 rounded-pill px-5 text-[0.9375rem] font-semibold tracking-tight transition-all duration-200 active:scale-[0.98] sm:px-6 ${
            dark ? 'bg-owner text-ink hover:brightness-95' : 'bg-ink text-white hover:bg-ink-soft'
          }`}
        >
          Search
        </button>
      </div>

      {open && results.length > 0 ? (
        <ul
          id="locality-search-results"
          role="listbox"
          className="absolute z-50 mt-2 w-full overflow-hidden rounded-panel border border-line bg-surface p-2 shadow-[0_20px_60px_rgb(20_20_20/0.14)]"
        >
          {parsed.bhk || parsed.maxRent ? (
            <li className="px-3 py-2 text-xs text-muted">
              Filtering for{' '}
              {parsed.bhk ? <strong className="text-ink">{parsed.bhk.replace('BHK', ' BHK')}</strong> : null}
              {parsed.bhk && parsed.maxRent ? ' · ' : null}
              {parsed.maxRent ? <strong className="text-ink">under ₹{parsed.maxRent.toLocaleString('en-IN')}</strong> : null}
            </li>
          ) : null}
          {results.map((l, i) => (
            <li key={l.id}>
              <button
                type="button"
                role="option"
                aria-selected={i === highlight}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => go(l.slug)}
                className={`flex w-full items-center justify-between rounded-field px-3 py-2.5 text-left transition-colors ${
                  i === highlight ? 'bg-ground' : ''
                }`}
              >
                <span className="font-medium text-ink">{l.name}</span>
                <span className="text-xs text-faint">{l.zone}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
