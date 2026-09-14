import type { StyleSpecification } from 'maplibre-gl';

/**
 * Basemap.
 *
 * CARTO Positron by default - no token, and its near-grey palette keeps the
 * product's accents the only colour on screen. A MapTiler key swaps in a
 * higher-detail vector style when one is configured.
 */
export function basemapStyle(): string | StyleSpecification {
  const maptiler = process.env.NEXT_PUBLIC_MAPTILER_KEY;
  if (maptiler) return `https://api.maptiler.com/maps/dataviz-light/style.json?key=${maptiler}`;
  return 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
}

/** Used when the tile CDN is unreachable, so the data still plots on a plain ground. */
export const FALLBACK_STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: 'ground', type: 'background', paint: { 'background-color': '#eeeeea' } }],
};

export const KIND_COLORS = {
  rent: '#a54df1',
  listing: '#7ec400',
  tolet: '#225aeb',
} as const;

export const CHENNAI_BOUNDS: [[number, number], [number, number]] = [
  [79.95, 12.6],
  [80.45, 13.3],
];
