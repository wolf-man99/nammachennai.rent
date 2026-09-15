/**
 * Regenerates data/localities.ts from public sources.
 *
 * Names and coordinates come from Wikipedia's maintained Chennai categories,
 * with OpenStreetMap's Nominatim as a backstop for rental-relevant areas that
 * have no Wikipedia coordinates. Nothing here is invented: a locality that
 * cannot be geolocated from a real source is dropped rather than guessed, since
 * a wrong coordinate puts a map pin on the wrong street.
 *
 *   npx tsx scripts/build-localities.ts
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { foldLocalityName } from '../lib/search-query';

const UA = 'rentinchennai-locality-builder/1.0 (https://rentinchennai.in)';

/** Chennai metropolitan area. Anything outside is a same-named place elsewhere. */
const BBOX = { minLat: 12.7, maxLat: 13.35, minLon: 79.95, maxLon: 80.4 };

const CATEGORIES = [
  'Neighbourhoods in Chennai',
  'Suburbs of Chennai',
  'Cities and towns in Chengalpattu district',
  'Cities and towns in Tiruvallur district',
];

/**
 * Areas that matter for renting and are not reliably in those categories -
 * mostly the OMR corridor and southern suburbs outside Corporation limits.
 * Geocoded individually if Wikipedia does not supply them.
 */
const MUST_HAVE = [
  'Thoraipakkam', 'Navalur', 'Siruseri', 'Semmancheri', 'Padur', 'Thalambur', 'Egattur',
  'Perumbakkam', 'Medavakkam', 'Thiruvanmiyur', 'Besant Nagar', 'Neelankarai', 'Injambakkam',
  'Palavakkam', 'Kottivakkam', 'Uthandi', 'Karapakkam', 'Tambaram', 'Chromepet', 'Pallavaram',
  'Selaiyur', 'Sembakkam', 'Rajakilpakkam', 'Chitlapakkam', 'Hastinapuram', 'Perungalathur',
  'Guduvancheri', 'Urapakkam', 'Vandalur', 'Kattankulathur', 'Potheri', 'Maraimalai Nagar',
  'Avadi', 'Poonamallee', 'Iyyappanthangal', 'Kundrathur', 'Gerugambakkam', 'Manapakkam',
  'Mugalivakkam', 'Keelkattalai', 'Kovilambakkam', 'Nanmangalam', 'Vengaivasal', 'Ottiyambakkam',
  'Kovalam', 'Muttukadu', 'Mambakkam', 'Ponmar', 'Pudupakkam', 'Kelambakkam',
];

/** Zone centroids. Each locality joins the nearest one. */
const ZONES: { name: string; slug: string; blurb: string; latitude: number; longitude: number }[] = [
  { name: 'OMR', slug: 'omr', blurb: 'The IT corridor running south from Perungudi to Kelambakkam.', latitude: 12.9, longitude: 80.231 },
  { name: 'Velachery Belt', slug: 'velachery-belt', blurb: 'Velachery and the established residential pockets around it.', latitude: 12.956, longitude: 80.204 },
  { name: 'GST Corridor', slug: 'gst-corridor', blurb: 'Tambaram, Chromepet and the suburban rail belt to the south west.', latitude: 12.93, longitude: 80.115 },
  { name: 'Central Chennai', slug: 'central-chennai', blurb: 'The older core - Nungambakkam, T Nagar, Anna Nagar, Egmore, Kilpauk.', latitude: 13.06, longitude: 80.235 },
  { name: 'Coastal', slug: 'coastal', blurb: 'Adyar, Besant Nagar and the southern coastline down ECR.', latitude: 13.0, longitude: 80.265 },
  { name: 'West Chennai', slug: 'west-chennai', blurb: 'Porur, Valasaravakkam, Mogappair and the western suburbs.', latitude: 13.035, longitude: 80.16 },
  { name: 'North Chennai', slug: 'north-chennai', blurb: 'Perambur, Kolathur, Madhavaram and the northern neighbourhoods.', latitude: 13.13, longitude: 80.22 },
  { name: 'Outer South', slug: 'outer-south', blurb: 'Vandalur, Guduvancheri and the GST stretch towards Maraimalai Nagar.', latitude: 12.79, longitude: 80.08 },
];

/** Curated tiers for the areas with the most rental demand; everything else is tier 3. */
const TIER_1 = new Set([
  'perungudi', 'thoraipakkam', 'sholinganallur', 'navalur', 'kelambakkam',
  'velachery', 'pallikaranai', 'madipakkam', 'adambakkam',
]);
const TIER_2 = new Set([
  'medavakkam', 'tambaram', 'chromepet', 'guindy', 'adyar', 'siruseri', 'perumbakkam',
  'thiruvanmiyur', 'porur', 'nanganallur', 'pallavaram', 'karapakkam', 'semmancheri',
]);

interface Place {
  name: string;
  slug: string;
  latitude: number;
  longitude: number;
  source: string;
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/[.'']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Article titles carry disambiguators: "Adyar, Chennai", "Madhavaram, Ponneri",
 * "Potheri Village, Chengalpattu". Everything after the first comma is the
 * disambiguator, never part of the locality name, and leaving it in creates a
 * second entry that splits one locality's rent data in two.
 */
function cleanName(title: string) {
  return title
    .split(',')[0]
    .replace(/\s*\(.*?\)\s*$/, '')
    .replace(/\s+Village$/i, '')
    .trim();
}

function inChennai(lat: number, lon: number) {
  return lat >= BBOX.minLat && lat <= BBOX.maxLat && lon >= BBOX.minLon && lon <= BBOX.maxLon;
}

async function getJson(url: string): Promise<Record<string, unknown>> {
  const res = await fetch(url, { headers: { 'user-agent': UA } });
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  return (await res.json()) as Record<string, unknown>;
}

async function fromCategory(category: string): Promise<Place[]> {
  const url =
    'https://en.wikipedia.org/w/api.php?action=query&format=json&generator=categorymembers' +
    `&gcmtitle=Category%3A${encodeURIComponent(category)}&gcmlimit=500&gcmtype=page` +
    '&prop=coordinates&colimit=500';
  const data = (await getJson(url)) as {
    query?: { pages?: Record<string, { title: string; coordinates?: { lat: number; lon: number }[] }> };
  };
  const pages = Object.values(data.query?.pages ?? {});
  const out: Place[] = [];
  for (const page of pages) {
    const c = page.coordinates?.[0];
    if (!c || !inChennai(c.lat, c.lon)) continue;
    const name = cleanName(page.title);
    if (!name || name.length > 40) continue;
    out.push({ name, slug: slugify(name), latitude: c.lat, longitude: c.lon, source: 'wikipedia' });
  }
  return out;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Spellings Nominatim indexes differently from common usage. Without these the
 * areas resolve to nothing and get dropped.
 */
const GEOCODE_ALIASES: Record<string, string> = {
  Kattankulathur: 'Kattangulathur',
  Iyyappanthangal: 'Iyappanthangal, Chennai',
  Ottiyambakkam: 'Ottiambakkam, Chennai',
};

/** Nominatim asks for at most one request per second. */
async function geocode(name: string): Promise<Place | null> {
  // Querying unbounded and validating against the box afterwards resolves far
  // more places than `bounded=1`, while still rejecting same-named places
  // elsewhere in Tamil Nadu.
  const query = GEOCODE_ALIASES[name] ?? `${name}, Tamil Nadu`;
  const url =
    'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in' +
    `&q=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA } });
    if (!res.ok) return null;
    const rows = (await res.json()) as { lat: string; lon: string }[];
    const hit = rows[0];
    if (!hit) return null;
    const lat = Number(hit.lat);
    const lon = Number(hit.lon);
    if (!inChennai(lat, lon)) return null;
    return { name, slug: slugify(name), latitude: lat, longitude: lon, source: 'nominatim' };
  } catch {
    return null;
  }
}

function nearestZone(lat: number, lon: number) {
  let best = ZONES[0];
  let bestD = Infinity;
  for (const z of ZONES) {
    const d = (z.latitude - lat) ** 2 + (z.longitude - lon) ** 2;
    if (d < bestD) {
      bestD = d;
      best = z;
    }
  }
  return best.name;
}

async function main() {
  /*
   * Keyed by folded name, not slug: "Iyyapanthangal" and "Iyyappanthangal" are
   * one place written two ways, and two entries would split its rent data.
   */
  const byKey = new Map<string, Place>();
  const bySlug = byKey; // same store; the key is the folded name

  for (const category of CATEGORIES) {
    const places = await fromCategory(category);
    let added = 0;
    for (const p of places) {
      const key = foldLocalityName(p.name);
      if (!byKey.has(key)) {
        byKey.set(key, p);
        added += 1;
      }
    }
    console.log(`  ${category}: ${places.length} in area, ${added} new`);
  }

  const missing = MUST_HAVE.filter((n) => !byKey.has(foldLocalityName(n)));
  console.log(`  geocoding ${missing.length} rental areas Wikipedia did not cover…`);
  for (const name of missing) {
    const place = await geocode(name);
    if (place) byKey.set(foldLocalityName(place.name), place);
    else console.warn(`    could not geolocate "${name}" - skipped rather than guessed`);
    await sleep(1100);
  }

  const places = [...bySlug.values()].sort((a, b) => a.name.localeCompare(b.name));
  const tierOf = (slug: string) => (TIER_1.has(slug) ? 1 : TIER_2.has(slug) ? 2 : 3);

  const rows = places
    .map((p) => {
      const zone = nearestZone(p.latitude, p.longitude);
      return `  { name: ${JSON.stringify(p.name)}, slug: ${JSON.stringify(p.slug)}, latitude: ${p.latitude.toFixed(4)}, longitude: ${p.longitude.toFixed(4)}, zone: ${JSON.stringify(zone)}, tier: ${tierOf(p.slug)} },`;
    })
    .join('\n');

  const zoneRows = ZONES.map(
    (z) =>
      `  {\n    name: ${JSON.stringify(z.name)},\n    slug: ${JSON.stringify(z.slug)},\n    blurb: ${JSON.stringify(z.blurb)},\n    latitude: ${z.latitude},\n    longitude: ${z.longitude},\n  },`,
  ).join('\n');

  const file = `/**
 * Chennai locality reference data.
 *
 * Generated by \`npx tsx scripts/build-localities.ts\` from Wikipedia's Chennai
 * categories and OpenStreetMap's Nominatim. Geographic reference only - names,
 * slugs and approximate centroids. No rental figures live here; every number the
 * product shows is computed from submitted data.
 *
 * ${places.length} localities. Edit the script, not this file.
 */

export interface LocalitySeed {
  name: string;
  slug: string;
  latitude: number;
  longitude: number;
  zone: string;
  tier: 1 | 2 | 3;
}

export const CHENNAI_LOCALITIES: LocalitySeed[] = [
${rows}
];

/** Corridors get their own page - renters search "OMR" far more than any single node on it. */
export interface ZoneSeed {
  name: string;
  slug: string;
  blurb: string;
  latitude: number;
  longitude: number;
}

export const CHENNAI_ZONES: ZoneSeed[] = [
${zoneRows}
];

export const CHENNAI_CENTER = { latitude: 12.98, longitude: 80.218 } as const;
`;

  await fs.writeFile(path.join(process.cwd(), 'data', 'localities.ts'), file);
  const tiers = places.reduce<Record<number, number>>((acc, p) => {
    const t = tierOf(p.slug);
    acc[t] = (acc[t] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`\nWrote ${places.length} localities (tier1 ${tiers[1] ?? 0}, tier2 ${tiers[2] ?? 0}, tier3 ${tiers[3] ?? 0})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
