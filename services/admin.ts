import { db, eq, inList } from '@/lib/db';
import { CITY } from '@/lib/constants';
import { getLocalityMap } from './localities';
import { getStaleToletReports } from './tolet';
import type {
  FlatmateListing,
  Listing,
  RentSubmission,
  Report,
  Seeker,
  ToletReport,
} from '@/types';

export interface AdminMetrics {
  rentSubmissions: number;
  pendingRent: number;
  activeListings: number;
  pendingListings: number;
  seekers: number;
  matches: number;
  toletReports: number;
  staleTolet: number;
  flatmates: number;
  reports: number;
}

export async function getAdminMetrics(): Promise<AdminMetrics> {
  const store = db();
  const [
    rentSubmissions,
    pendingRent,
    activeListings,
    pendingListings,
    seekers,
    matches,
    toletReports,
    flatmates,
    reports,
    stale,
  ] = await Promise.all([
    store.count('rent_submissions'),
    store.count('rent_submissions', [eq('verification_status', 'pending')]),
    store.count('listings', [eq('status', 'active')]),
    store.count('listings', [eq('verification_status', 'pending')]),
    store.count('seekers'),
    store.count('matches'),
    store.count('tolet_reports', [eq('status', 'active')]),
    store.count('flatmate_listings', [eq('status', 'active')]),
    store.count('reports'),
    getStaleToletReports(500),
  ]);

  return {
    rentSubmissions,
    pendingRent,
    activeListings,
    pendingListings,
    seekers,
    matches,
    toletReports,
    staleTolet: stale.length,
    flatmates,
    reports,
  };
}

export interface AdminQueues {
  rent: (RentSubmission & { localityName: string })[];
  listings: (Listing & { localityName: string })[];
  flatmates: (FlatmateListing & { localityName: string })[];
  tolet: (ToletReport & { localityName: string })[];
  reports: Report[];
  seekers: (Seeker & { localityName: string })[];
}

export async function getAdminQueues(): Promise<AdminQueues> {
  const store = db();
  const localityMap = await getLocalityMap();
  const name = (id: string) => localityMap.get(id)?.name ?? 'Unknown';

  const [rent, listings, flatmates, tolet, reports, seekers] = await Promise.all([
    store.find<RentSubmission>('rent_submissions', {
      where: [eq('city', CITY), eq('verification_status', 'pending')],
      orderBy: { field: 'created_at', dir: 'desc' },
      limit: 40,
    }),
    store.find<Listing>('listings', {
      where: [eq('city', CITY), inList('verification_status', ['pending'])],
      orderBy: { field: 'created_at', dir: 'desc' },
      limit: 40,
    }),
    store.find<FlatmateListing>('flatmate_listings', {
      where: [eq('city', CITY), eq('verification_status', 'pending')],
      orderBy: { field: 'created_at', dir: 'desc' },
      limit: 40,
    }),
    getStaleToletReports(40),
    store.find<Report>('reports', { orderBy: { field: 'created_at', dir: 'desc' }, limit: 40 }),
    store.find<Seeker>('seekers', { orderBy: { field: 'created_at', dir: 'desc' }, limit: 20 }),
  ]);

  return {
    rent: rent.map((r) => ({ ...r, localityName: name(r.locality_id) })),
    listings: listings.map((r) => ({ ...r, localityName: name(r.locality_id) })),
    flatmates: flatmates.map((r) => ({ ...r, localityName: name(r.locality_id) })),
    tolet: tolet.map((r) => ({ ...r, localityName: name(r.locality_id) })),
    reports,
    seekers: seekers.map((r) => ({ ...r, localityName: name(r.locality_id) })),
  };
}
