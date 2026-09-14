import { db, eq, gte, inList, lte, type Condition } from '@/lib/db';
import { CITY } from '@/lib/constants';
import type { Bhk, FlatmateListing, GenderPreference, PublicFlatmateListing, RoomType } from '@/types';
import { getLocalityMap } from './localities';

export function toPublicFlatmate(
  row: FlatmateListing,
  localityMap: Awaited<ReturnType<typeof getLocalityMap>>,
): PublicFlatmateListing {
  const {
    contact_name: _name,
    contact_phone: _phone,
    contact_email: _email,
    user_id: _userId,
    ...safe
  } = row;
  return { ...safe, locality: localityMap.get(row.locality_id) ?? null };
}

export interface FlatmateFilters {
  localityIds?: string[];
  roomType?: RoomType[];
  gender?: GenderPreference;
  maxRent?: number;
  minRent?: number;
  totalBhk?: Bhk[];
  limit?: number;
}

export async function getFlatmateListings(filters: FlatmateFilters = {}): Promise<PublicFlatmateListing[]> {
  const where: Condition[] = [
    eq('city', CITY),
    eq('status', 'active'),
    inList('verification_status', ['pending', 'verified']),
  ];
  if (filters.localityIds?.length) where.push(inList('locality_id', filters.localityIds));
  if (filters.roomType?.length) where.push(inList('room_type', filters.roomType));
  if (filters.totalBhk?.length) where.push(inList('total_bhk', filters.totalBhk));
  if (filters.gender && filters.gender !== 'any') where.push(inList('gender_preference', ['any', filters.gender]));
  if (filters.minRent) where.push(gte('rent', filters.minRent));
  if (filters.maxRent) where.push(lte('rent', filters.maxRent));

  const [rows, localityMap] = await Promise.all([
    db().find<FlatmateListing>('flatmate_listings', {
      where,
      orderBy: { field: 'created_at', dir: 'desc' },
      limit: filters.limit,
    }),
    getLocalityMap(),
  ]);
  return rows.map((r) => toPublicFlatmate(r, localityMap));
}
