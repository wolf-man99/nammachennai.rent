'use client';

import { useState } from 'react';

/** Optional precision. The coordinate is coarsened before it is ever published. */
export function UseMyLocation({
  value,
  onChange,
}: {
  value: { latitude: number; longitude: number } | null;
  onChange: (v: { latitude: number; longitude: number } | null) => void;
}) {
  const [state, setState] = useState<'idle' | 'loading' | 'denied'>('idle');

  if (value) {
    return (
      <div className="flex items-center justify-between rounded-field bg-owner-soft px-4 py-3 text-sm">
        <span className="font-medium text-owner-ink">Approximate location added</span>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-xs font-semibold text-muted underline-offset-4 hover:underline"
        >
          Remove
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        disabled={state === 'loading'}
        onClick={() => {
          if (!navigator.geolocation) return setState('denied');
          setState('loading');
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              onChange({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
              setState('idle');
            },
            () => setState('denied'),
            { enableHighAccuracy: false, timeout: 8000 },
          );
        }}
        className="inline-flex items-center gap-2 rounded-pill border border-line-strong px-4 py-2.5 text-sm font-medium transition-colors hover:border-ink disabled:opacity-60"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.6" />
        </svg>
        {state === 'loading' ? 'Finding you…' : 'Use my current location'}
      </button>
      <p className="mt-2 text-xs text-faint">
        {state === 'denied'
          ? 'Location unavailable — the locality alone is enough.'
          : 'Optional. Improves map accuracy; we blur the exact point before publishing.'}
      </p>
    </div>
  );
}
