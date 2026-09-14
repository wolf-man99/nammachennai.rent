'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Bhk, Furnishing, MapPoint } from '@/types';
import type { LocalityPuck } from './types';
import { BHK_OPTIONS, FURNISHING_OPTIONS, LABELS } from '@/lib/constants';
import { formatRent, formatRentShort } from '@/lib/format';
import { Button, ButtonLink, Eyebrow, Pill, TrendPill } from '@/components/ui/primitives';
import { MultiSelect } from '@/components/forms/Fields';
import { BarSeries } from '@/components/charts';
import { track } from '@/lib/analytics';

/** MapLibre is ~200 kB — it only loads once the map surface is actually on screen. */
const RentMap = dynamic(() => import('./RentMap').then((m) => m.RentMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-surface-sunk">
      <span className="text-sm text-faint">Loading map…</span>
    </div>
  ),
});

export interface MapLocalitySummary {
  slug: string;
  name: string;
  zone: string | null;
  lat: number;
  lng: number;
  reports: number;
  listings: number;
  median: number | null;
  twoBhkMedian: number | null;
  p25: number | null;
  p75: number | null;
  trend: number | null;
}

const RENT_STEPS = [10_000, 15_000, 20_000, 25_000, 30_000, 40_000, 60_000, 100_000];

export function MapExplorer({ summaries }: { summaries: MapLocalitySummary[] }) {
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [kinds, setKinds] = useState<('rent' | 'listing' | 'tolet')[]>(['rent', 'listing', 'tolet']);
  const [bhk, setBhk] = useState<Bhk[]>([]);
  const [furnishing, setFurnishing] = useState<Furnishing[]>([]);
  const [maxRent, setMaxRent] = useState<number | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<MapPoint | null>(null);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [focus, setFocus] = useState<{ lat: number; lng: number; zoom: number } | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    track('map_open', {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    kinds.forEach((k) => params.append('kind', k));
    bhk.forEach((b) => params.append('bhk', b));
    furnishing.forEach((f) => params.append('furnishing', f));
    if (maxRent) params.set('maxRent', String(maxRent));

    let cancelled = false;
    setLoading(true);
    fetch(`/api/map?${params.toString()}`)
      .then((r) => r.json())
      .then((json: { ok: boolean; data: MapPoint[] }) => {
        if (!cancelled && json.ok) setPoints(json.data);
      })
      .catch(() => undefined)
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [kinds, bhk, furnishing, maxRent]);

  const pucks: LocalityPuck[] = useMemo(
    () =>
      summaries.map((s) => ({
        slug: s.slug,
        name: s.name,
        label: s.median ? formatRentShort(s.median) : null,
        lat: s.lat,
        lng: s.lng,
        reports: s.reports,
      })),
    [summaries],
  );

  const selected = selectedSlug ? summaries.find((s) => s.slug === selectedSlug) ?? null : null;

  const onSelectLocality = useCallback(
    (slug: string) => {
      setSelectedPoint(null);
      setSelectedSlug(slug);
      const s = summaries.find((x) => x.slug === slug);
      if (s) setFocus({ lat: s.lat, lng: s.lng, zoom: 13 });
    },
    [summaries],
  );

  const onSelectPoint = useCallback((p: MapPoint) => {
    setSelectedSlug(null);
    setSelectedPoint(p);
  }, []);

  const filterUsed = (name: string) => track('map_filter_used', { filter: name });

  const counts = useMemo(
    () => ({
      rent: points.filter((p) => p.kind === 'rent').length,
      listing: points.filter((p) => p.kind === 'listing').length,
      tolet: points.filter((p) => p.kind === 'tolet').length,
    }),
    [points],
  );

  return (
    <div className="relative h-[calc(100dvh-4rem)] w-full overflow-hidden lg:h-[calc(100dvh-5.5rem)]">
      <RentMap
        points={points}
        pucks={pucks}
        onSelectPoint={onSelectPoint}
        onSelectLocality={onSelectLocality}
        focus={focus}
      />

      {/* ------------------------------------------------- Filter rail */}
      <div className="pointer-events-none absolute inset-x-0 top-0 p-3 sm:p-4">
        <div className="pointer-events-auto mx-auto flex max-w-[1320px] flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-pill border border-line bg-surface/95 p-1.5 shadow-[0_8px_30px_rgb(20_20_20/0.08)] backdrop-blur-xl">
            {(
              [
                { key: 'rent', label: 'Rent data', dot: 'bg-data', count: counts.rent },
                { key: 'listing', label: 'Owner homes', dot: 'bg-owner', count: counts.listing },
                { key: 'tolet', label: 'To-Let', dot: 'bg-tolet', count: counts.tolet },
              ] as const
            ).map((k) => {
              const active = kinds.includes(k.key);
              return (
                <button
                  key={k.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    filterUsed(k.key);
                    setKinds((prev) =>
                      prev.includes(k.key) ? prev.filter((x) => x !== k.key) : [...prev, k.key],
                    );
                  }}
                  className={`inline-flex items-center gap-2 rounded-pill px-3.5 py-2 text-xs font-semibold tracking-tight transition-colors sm:text-sm ${
                    active ? 'bg-ink text-white' : 'text-muted hover:bg-ground'
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${k.dot} ${active ? '' : 'opacity-40'}`} />
                  <span className="hidden sm:inline">{k.label}</span>
                  <span className="sm:hidden">{k.label.split(' ')[0]}</span>
                  <span className="tabular-nums opacity-60">{k.count}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            className={`inline-flex h-11 items-center gap-2 rounded-pill border px-4 text-sm font-semibold shadow-[0_8px_30px_rgb(20_20_20/0.08)] backdrop-blur-xl transition-colors ${
              filtersOpen || bhk.length || furnishing.length || maxRent
                ? 'border-ink bg-ink text-white'
                : 'border-line bg-surface/95 text-ink'
            }`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            Filters
            {bhk.length || furnishing.length || maxRent ? (
              <span className="rounded-pill bg-owner px-1.5 text-[0.625rem] text-ink">
                {bhk.length + furnishing.length + (maxRent ? 1 : 0)}
              </span>
            ) : null}
          </button>

          {loading ? (
            <span className="rounded-pill bg-ink/85 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">
              Updating…
            </span>
          ) : null}
        </div>

        {filtersOpen ? (
          <div className="pointer-events-auto mx-auto mt-2 max-w-[1320px]">
            <div className="max-w-xl rounded-card border border-line bg-surface/97 p-5 shadow-[0_18px_50px_rgb(20_20_20/0.12)] backdrop-blur-xl">
              <div className="space-y-5">
                <div>
                  <Eyebrow className="mb-3">Size</Eyebrow>
                  <MultiSelect
                    options={BHK_OPTIONS}
                    value={bhk}
                    onChange={(v) => {
                      filterUsed('bhk');
                      setBhk(v);
                    }}
                  />
                </div>
                <div>
                  <Eyebrow className="mb-3">Furnishing</Eyebrow>
                  <MultiSelect
                    options={FURNISHING_OPTIONS}
                    value={furnishing}
                    onChange={(v) => {
                      filterUsed('furnishing');
                      setFurnishing(v);
                    }}
                  />
                </div>
                <div>
                  <Eyebrow className="mb-3">Maximum rent</Eyebrow>
                  <div className="flex flex-wrap gap-2">
                    {RENT_STEPS.map((step) => (
                      <button
                        key={step}
                        type="button"
                        onClick={() => {
                          filterUsed('maxRent');
                          setMaxRent(maxRent === step ? null : step);
                        }}
                        className={`rounded-pill border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                          maxRent === step
                            ? 'border-ink bg-ink text-white'
                            : 'border-line-strong text-muted hover:border-ink hover:text-ink'
                        }`}
                      >
                        {formatRentShort(step)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between gap-3 border-t border-line pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setBhk([]);
                    setFurnishing([]);
                    setMaxRent(null);
                  }}
                  className="text-sm font-semibold text-muted hover:text-ink"
                >
                  Clear all
                </button>
                <Button type="button" size="sm" onClick={() => setFiltersOpen(false)}>
                  Show {points.length} results
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* ------------------------------------------------------- Panel */}
      {selected || selectedPoint ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-3 sm:p-4 lg:inset-y-0 lg:left-auto lg:right-0 lg:flex lg:w-[400px] lg:items-center">
          <div className="pointer-events-auto max-h-[62dvh] overflow-y-auto rounded-card border border-line bg-surface p-6 shadow-[0_24px_70px_rgb(20_20_20/0.18)] lg:max-h-none">
            <button
              type="button"
              onClick={() => {
                setSelectedSlug(null);
                setSelectedPoint(null);
              }}
              className="float-right -mr-1 -mt-1 flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-ground hover:text-ink"
              aria-label="Close panel"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>

            {selected ? <LocalityPanel summary={selected} /> : null}
            {selectedPoint ? <PointPanel point={selectedPoint} /> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function LocalityPanel({ summary }: { summary: MapLocalitySummary }) {
  return (
    <div>
      <Eyebrow>Chennai</Eyebrow>
      <h2 className="mt-2 text-title font-semibold tracking-tight">{summary.name}</h2>
      <p className="mt-1 text-xs text-faint">{summary.zone}</p>

      {summary.twoBhkMedian || summary.median ? (
        <>
          <div className="mt-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-stat font-semibold tabular-nums">
                {formatRent(summary.twoBhkMedian ?? summary.median)}
              </p>
              <p className="mt-1.5 text-sm text-muted">
                Median {summary.twoBhkMedian ? '2 BHK' : 'rent'} · {summary.reports} renter{' '}
                {summary.reports === 1 ? 'report' : 'reports'}
              </p>
            </div>
            <TrendPill pct={summary.trend} />
          </div>

          {summary.p25 && summary.p75 ? (
            <div className="mt-6 rounded-panel p-4">
              <Eyebrow className="mb-3">Typical range</Eyebrow>
              <p className="text-lg font-semibold tabular-nums">
                {formatRentShort(summary.p25)} — {formatRentShort(summary.p75)}
              </p>
              <BarSeries
                values={[summary.p25, summary.median ?? summary.p25, summary.p75]}
                height={24}
                tone="data"
                className="mt-3"
                animated={false}
              />
            </div>
          ) : null}
        </>
      ) : (
        <div className="mt-6 rounded-panel border border-dashed border-line-strong p-5">
          <p className="font-semibold">Not enough renter data yet</p>
          <p className="mt-1.5 text-sm text-muted">
            {summary.reports === 0
              ? 'No one has reported a rent here.'
              : `${summary.reports} ${summary.reports === 1 ? 'report' : 'reports'} so far.`}{' '}
            Be one of the first.
          </p>
        </div>
      )}

      <div className="mt-6 flex items-center gap-3 text-sm text-muted">
        <Pill tone="owner">{summary.listings} owner homes</Pill>
      </div>

      <div className="mt-6 flex flex-col gap-2.5">
        <ButtonLink href={`/chennai/${summary.slug}`} className="w-full">
          View locality
        </ButtonLink>
        <ButtonLink href="/submit-rent" variant="outline" className="w-full">
          Submit your rent
        </ButtonLink>
      </div>
    </div>
  );
}

function PointPanel({ point }: { point: MapPoint }) {
  const meta = {
    rent: { label: 'Renter report', tone: 'data' as const },
    listing: { label: 'Owner direct', tone: 'owner' as const },
    tolet: { label: 'To-Let board', tone: 'tolet' as const },
  }[point.kind];

  return (
    <div>
      <Pill tone={meta.tone}>{meta.label}</Pill>
      <h2 className="mt-4 text-title font-semibold tracking-tight">
        {point.rent ? formatRent(point.rent) : 'Rent not stated'}
      </h2>
      <p className="mt-1.5 text-sm text-muted">
        {point.bhk ? `${LABELS.bhk[point.bhk]} · ` : ''}
        {point.locality}
      </p>

      <p className="mt-5 text-xs leading-relaxed text-faint">
        Map positions are approximate by design — we blur every coordinate before publishing so no
        individual home can be identified.
      </p>

      <div className="mt-6 flex flex-col gap-2.5">
        {point.href ? (
          <ButtonLink href={point.href} className="w-full">
            {point.kind === 'listing' ? 'View this home' : 'Open locality'}
          </ButtonLink>
        ) : null}
        {point.locality_slug ? (
          <ButtonLink href={`/chennai/${point.locality_slug}`} variant="outline" className="w-full">
            {point.locality} rent report
          </ButtonLink>
        ) : null}
      </div>
    </div>
  );
}

export function MapLegendLink() {
  return (
    <Link href="/submit-rent" className="text-sm font-semibold underline-offset-4 hover:underline">
      Add your rent
    </Link>
  );
}
