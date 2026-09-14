const R = 6371; // km

export function haversineKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

/**
 * Coarsen a coordinate before it is ever published.
 *
 * ~0.004 degrees is roughly 400m, enough to place a home on the right street
 * grid without pointing at a door. Applied to every public map point.
 */
export function fuzzCoordinate(
  lat: number | null,
  lng: number | null,
  seed: string,
): { lat: number; lng: number } | null {
  if (lat === null || lng === null) return null;
  const h = hash(seed);
  const jitterLat = (((h % 1000) / 1000) - 0.5) * 0.008;
  const jitterLng = (((Math.floor(h / 1000) % 1000) / 1000) - 0.5) * 0.008;
  return {
    lat: Number((lat + jitterLat).toFixed(4)),
    lng: Number((lng + jitterLng).toFixed(4)),
  };
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}
