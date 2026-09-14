import type { Metadata } from 'next';
import { MapExplorer, type MapLocalitySummary } from '@/components/map/MapExplorer';
import { getLocalitySummaries } from '@/services/rent-stats';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Chennai rent map — what renters actually pay',
  description:
    'Explore renter-reported rents, owner-direct listings and To-Let boards across Chennai on one map.',
  alternates: { canonical: '/map' },
};

export default async function MapPage() {
  const summaries = await getLocalitySummaries();

  const mapSummaries: MapLocalitySummary[] = summaries.map((s) => ({
    slug: s.locality.slug,
    name: s.locality.name,
    zone: s.locality.zone,
    lat: s.locality.latitude,
    lng: s.locality.longitude,
    reports: s.reports,
    listings: s.listings,
    median: s.stats?.median ?? null,
    twoBhkMedian: s.twoBhk?.median ?? null,
    p25: s.stats?.p25 ?? null,
    p75: s.stats?.p75 ?? null,
    trend: s.trend?.pct ?? null,
  }));

  return <MapExplorer summaries={mapSummaries} />;
}
