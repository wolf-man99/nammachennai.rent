import type { MetadataRoute } from 'next';
import { allAreaSlugs, resolveArea } from '@/services/localities';
import { getSubmissions } from '@/services/rent-stats';
import { getListings } from '@/services/listings';
import { BHK_SLUGS, BHK_VALUES, MIN_SAMPLE_INDEXABLE, SITE_URL } from '@/lib/constants';

export const revalidate = 3600;

/**
 * Only pages with something to say are listed. A BHK page is included once its
 * sample clears MIN_SAMPLE_INDEXABLE, which keeps thousands of thin pages out of
 * the index.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = ([
    { url: `${SITE_URL}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/map`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/explore`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/listings`, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${SITE_URL}/submit-rent`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/list-property`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/find`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/flatmates`, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/to-let`, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/about`, changeFrequency: 'monthly', priority: 0.4 },
  ] as const).map((r) => ({ ...r, lastModified: now }));

  const areas = await allAreaSlugs();

  const areaRoutes: MetadataRoute.Sitemap = areas.map((a) => ({
    url: `${SITE_URL}/chennai/${a.slug}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: a.kind === 'zone' ? 0.85 : 0.8,
  }));

  /*
   * Counted in one pass. Asking the database per area per size meant ~1,400
   * queries once Chennai had its full locality list, which made every build
   * hammer Supabase for a file that changes slowly.
   */
  const submissions = await getSubmissions();
  const counts = new Map<string, number>();
  for (const s of submissions) {
    const key = `${s.locality_id}|${s.bhk}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const bhkRoutes: MetadataRoute.Sitemap = [];
  for (const a of areas) {
    const area = await resolveArea(a.slug);
    if (!area) continue;
    for (const bhk of BHK_VALUES) {
      const sample = area.localities.reduce(
        (total, l) => total + (counts.get(`${l.id}|${bhk}`) ?? 0),
        0,
      );
      // Only pages carrying enough renter data to be useful are worth indexing.
      if (sample >= MIN_SAMPLE_INDEXABLE) {
        bhkRoutes.push({
          url: `${SITE_URL}/chennai/${a.slug}/${BHK_SLUGS[bhk]}`,
          lastModified: now,
          changeFrequency: 'weekly',
          priority: 0.75,
        });
      }
    }
  }

  const listings = await getListings({ limit: 500 });
  const listingRoutes: MetadataRoute.Sitemap = listings.map((l) => ({
    url: `${SITE_URL}/property/${l.id}`,
    lastModified: new Date(l.created_at),
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  return [...staticRoutes, ...areaRoutes, ...bhkRoutes, ...listingRoutes];
}
