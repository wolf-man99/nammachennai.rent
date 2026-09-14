import { db, eq, gte, inList, lte, type Condition } from '@/lib/db';
import { CITY } from '@/lib/constants';
import { fuzzCoordinate } from '@/lib/geo';
import type { Bhk, Furnishing, Listing, Locality, MapPoint, PropertyType, RentSubmission, ToletReport } from '@/types';
import { getLocalityMap } from './localities';
import { formatRentShort } from '@/lib/format';

export interface MapFilters {
  kinds?: ('rent' | 'listing' | 'tolet')[];
  bhk?: Bhk[];
  minRent?: number;
  maxRent?: number;
  furnishing?: Furnishing[];
  propertyType?: PropertyType[];
  localityIds?: string[];
}

const DEFAULT_KINDS: ('rent' | 'listing' | 'tolet')[] = ['rent', 'listing', 'tolet'];

/**
 * Every published coordinate is coarsened first. A map point should place a home
 * on the right street grid, never at a door.
 */
function point(
  kind: MapPoint['kind'],
  row: { id: string; latitude: number | null; longitude: number | null; locality_id: string },
  locality: Locality | null,
  rest: Omit<MapPoint, 'id' | 'kind' | 'lat' | 'lng' | 'locality' | 'locality_slug'>,
): MapPoint | null {
  const lat = row.latitude ?? locality?.latitude ?? null;
  const lng = row.longitude ?? locality?.longitude ?? null;
  const fuzzed = fuzzCoordinate(lat, lng, `${kind}:${row.id}`);
  if (!fuzzed) return null;
  return {
    id: `${kind}-${row.id}`,
    kind,
    lat: fuzzed.lat,
    lng: fuzzed.lng,
    locality: locality?.name ?? 'Chennai',
    locality_slug: locality?.slug ?? '',
    ...rest,
  };
}

function shared(filters: MapFilters, rentField = 'rent'): Condition[] {
  const where: Condition[] = [eq('city', CITY)];
  if (filters.bhk?.length) where.push(inList('bhk', filters.bhk));
  if (filters.localityIds?.length) where.push(inList('locality_id', filters.localityIds));
  if (filters.minRent) where.push(gte(rentField, filters.minRent));
  if (filters.maxRent) where.push(lte(rentField, filters.maxRent));
  return where;
}

export async function getMapPoints(filters: MapFilters = {}): Promise<MapPoint[]> {
  const kinds = filters.kinds?.length ? filters.kinds : DEFAULT_KINDS;
  const store = db();
  const localityMap = await getLocalityMap();
  const out: MapPoint[] = [];

  if (kinds.includes('rent')) {
    const where = shared(filters);
    where.push(inList('verification_status', ['pending', 'verified']));
    if (filters.furnishing?.length) where.push(inList('furnishing', filters.furnishing));
    if (filters.propertyType?.length) where.push(inList('property_type', filters.propertyType));
    const rows = await store.find<RentSubmission>('rent_submissions', {
      where,
      orderBy: { field: 'created_at', dir: 'desc' },
      limit: 1200,
    });
    for (const r of rows) {
      const locality = localityMap.get(r.locality_id) ?? null;
      const p = point('rent', r, locality, {
        rent: r.rent,
        bhk: r.bhk,
        href: locality ? `/chennai/${locality.slug}` : null,
        label: `${r.bhk.replace('BHK', ' BHK')} · ${formatRentShort(r.rent)}`,
      });
      if (p) out.push(p);
    }
  }

  if (kinds.includes('listing')) {
    const where = shared(filters);
    where.push(eq('status', 'active'));
    if (filters.furnishing?.length) where.push(inList('furnishing', filters.furnishing));
    if (filters.propertyType?.length) where.push(inList('property_type', filters.propertyType));
    const rows = await store.find<Listing>('listings', {
      where,
      orderBy: { field: 'created_at', dir: 'desc' },
      limit: 600,
    });
    for (const r of rows) {
      const locality = localityMap.get(r.locality_id) ?? null;
      const p = point('listing', r, locality, {
        rent: r.rent,
        bhk: r.bhk,
        href: `/property/${r.id}`,
        label: `${r.bhk.replace('BHK', ' BHK')} · ${formatRentShort(r.rent)}`,
      });
      if (p) out.push(p);
    }
  }

  if (kinds.includes('tolet')) {
    const where = shared(filters);
    where.push(eq('status', 'active'));
    const rows = await store.find<ToletReport>('tolet_reports', {
      where,
      orderBy: { field: 'created_at', dir: 'desc' },
      limit: 600,
    });
    for (const r of rows) {
      const locality = localityMap.get(r.locality_id) ?? null;
      const p = point('tolet', r, locality, {
        rent: r.rent,
        bhk: r.bhk,
        href: '/to-let',
        label: r.rent ? `To-Let · ${formatRentShort(r.rent)}` : 'To-Let board',
      });
      if (p) out.push(p);
    }
  }

  return out;
}
