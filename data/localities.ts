/**
 * Chennai locality reference data.
 *
 * Geographic reference only - names, slugs and approximate centroids. No rental
 * figures live here; every number the product shows is computed from submitted
 * data. Adding a city later means adding entries with a different `city`.
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
  // Tier 1 - OMR / IT corridor
  { name: 'Perungudi', slug: 'perungudi', latitude: 12.9698, longitude: 80.2452, zone: 'OMR', tier: 1 },
  { name: 'Thoraipakkam', slug: 'thoraipakkam', latitude: 12.9416, longitude: 80.2337, zone: 'OMR', tier: 1 },
  { name: 'Sholinganallur', slug: 'sholinganallur', latitude: 12.901, longitude: 80.2279, zone: 'OMR', tier: 1 },
  { name: 'Navalur', slug: 'navalur', latitude: 12.8442, longitude: 80.2274, zone: 'OMR', tier: 1 },
  { name: 'Kelambakkam', slug: 'kelambakkam', latitude: 12.7833, longitude: 80.22, zone: 'OMR', tier: 1 },

  // Tier 1 - Velachery belt
  { name: 'Velachery', slug: 'velachery', latitude: 12.9791, longitude: 80.221, zone: 'Velachery Belt', tier: 1 },
  { name: 'Pallikaranai', slug: 'pallikaranai', latitude: 12.935, longitude: 80.21, zone: 'Velachery Belt', tier: 1 },
  { name: 'Madipakkam', slug: 'madipakkam', latitude: 12.962, longitude: 80.196, zone: 'Velachery Belt', tier: 1 },
  { name: 'Adambakkam', slug: 'adambakkam', latitude: 12.989, longitude: 80.201, zone: 'Velachery Belt', tier: 1 },

  // Tier 2
  { name: 'Medavakkam', slug: 'medavakkam', latitude: 12.918, longitude: 80.193, zone: 'Velachery Belt', tier: 2 },
  { name: 'Tambaram', slug: 'tambaram', latitude: 12.9249, longitude: 80.1, zone: 'GST Corridor', tier: 2 },
  { name: 'Chromepet', slug: 'chromepet', latitude: 12.9516, longitude: 80.1462, zone: 'GST Corridor', tier: 2 },
  { name: 'Guindy', slug: 'guindy', latitude: 13.0067, longitude: 80.2206, zone: 'Central Chennai', tier: 2 },
  { name: 'Adyar', slug: 'adyar', latitude: 13.0067, longitude: 80.257, zone: 'Coastal', tier: 2 },

  // Tier 3
  { name: 'Anna Nagar', slug: 'anna-nagar', latitude: 13.085, longitude: 80.2101, zone: 'Central Chennai', tier: 3 },
  { name: 'Nungambakkam', slug: 'nungambakkam', latitude: 13.0569, longitude: 80.2425, zone: 'Central Chennai', tier: 3 },
  { name: 'T Nagar', slug: 't-nagar', latitude: 13.0418, longitude: 80.2341, zone: 'Central Chennai', tier: 3 },
  { name: 'Besant Nagar', slug: 'besant-nagar', latitude: 12.9985, longitude: 80.2669, zone: 'Coastal', tier: 3 },
  { name: 'Porur', slug: 'porur', latitude: 13.0359, longitude: 80.1567, zone: 'Central Chennai', tier: 3 },
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
  {
    name: 'OMR',
    slug: 'omr',
    blurb: 'The IT corridor running south from Perungudi to Kelambakkam.',
    latitude: 12.908,
    longitude: 80.231,
  },
  {
    name: 'Velachery Belt',
    slug: 'velachery-belt',
    blurb: 'Velachery and the established residential pockets around it.',
    latitude: 12.956,
    longitude: 80.204,
  },
  {
    name: 'GST Corridor',
    slug: 'gst-corridor',
    blurb: 'Tambaram, Chromepet and the suburban rail belt to the south west.',
    latitude: 12.938,
    longitude: 80.123,
  },
  {
    name: 'Central Chennai',
    slug: 'central-chennai',
    blurb: 'The older core - Nungambakkam, T Nagar, Anna Nagar, Guindy, Porur.',
    latitude: 13.045,
    longitude: 80.213,
  },
  {
    name: 'Coastal',
    slug: 'coastal',
    blurb: 'Adyar and Besant Nagar, along the southern coastline.',
    latitude: 13.002,
    longitude: 80.262,
  },
];

export const CHENNAI_CENTER = { latitude: 12.98, longitude: 80.218 } as const;
