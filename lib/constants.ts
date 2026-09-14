import type { Bhk, Furnishing, GenderPreference, ParkingType, PropertyType, RoomType } from '@/types';

export const CITY = 'chennai' as const;
export const CITY_LABEL = 'Chennai';
export const SITE_NAME = 'Chennai.rent';
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://chennai.rent';
export const SITE_TAGLINE = 'Know what rent should cost.';

/** Minimum renter reports before a median is honest enough to publish. */
export const MIN_SAMPLE = 5;
/** Minimum reports before a BHK-specific SEO page is worth indexing. */
export const MIN_SAMPLE_INDEXABLE = 8;

export const BHK_OPTIONS: { value: Bhk; label: string; short: string }[] = [
  { value: '1RK', label: '1 RK', short: '1RK' },
  { value: '1BHK', label: '1 BHK', short: '1BHK' },
  { value: '2BHK', label: '2 BHK', short: '2BHK' },
  { value: '3BHK', label: '3 BHK', short: '3BHK' },
  { value: '4BHK+', label: '4 BHK+', short: '4BHK+' },
];

export const BHK_VALUES = BHK_OPTIONS.map((o) => o.value) as Bhk[];

export const BHK_SLUGS: Record<Bhk, string> = {
  '1RK': '1-rk',
  '1BHK': '1-bhk',
  '2BHK': '2-bhk',
  '3BHK': '3-bhk',
  '4BHK+': '4-bhk-plus',
};

export const SLUG_TO_BHK: Record<string, Bhk> = Object.fromEntries(
  Object.entries(BHK_SLUGS).map(([k, v]) => [v, k as Bhk]),
) as Record<string, Bhk>;

export const PROPERTY_TYPE_OPTIONS: { value: PropertyType; label: string }[] = [
  { value: 'apartment', label: 'Apartment' },
  { value: 'gated_community', label: 'Gated community' },
  { value: 'independent_house', label: 'Independent house' },
  { value: 'villa', label: 'Villa' },
  { value: 'studio', label: 'Studio' },
];

export const FURNISHING_OPTIONS: { value: Furnishing; label: string; short: string }[] = [
  { value: 'unfurnished', label: 'Unfurnished', short: 'Unfurnished' },
  { value: 'semi_furnished', label: 'Semi furnished', short: 'Semi' },
  { value: 'fully_furnished', label: 'Fully furnished', short: 'Full' },
];

export const PARKING_OPTIONS: { value: ParkingType; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'two_wheeler', label: 'Two wheeler' },
  { value: 'car', label: 'Car' },
  { value: 'both', label: 'Car + bike' },
];

export const ROOM_TYPE_OPTIONS: { value: RoomType; label: string }[] = [
  { value: 'private_room', label: 'Private room' },
  { value: 'shared_room', label: 'Shared room' },
  { value: 'full_flat', label: 'Whole flat' },
];

export const GENDER_OPTIONS: { value: GenderPreference; label: string }[] = [
  { value: 'any', label: 'Anyone' },
  { value: 'male', label: 'Men' },
  { value: 'female', label: 'Women' },
];

export const REPORT_REASONS = [
  { value: 'rented', label: 'Already rented' },
  { value: 'incorrect', label: 'Details are wrong' },
  { value: 'fake', label: 'Looks fake' },
  { value: 'duplicate', label: 'Duplicate' },
  { value: 'broker', label: 'Broker, not owner' },
] as const;

/** Guard rails for rent values. Anything outside this is a typo or spam, not a home. */
export const RENT_BOUNDS = { min: 1500, max: 1_500_000 } as const;
export const DEPOSIT_MAX = 5_000_000;
export const MAINTENANCE_MAX = 100_000;

export const LABELS = {
  bhk: Object.fromEntries(BHK_OPTIONS.map((o) => [o.value, o.label])) as Record<Bhk, string>,
  propertyType: Object.fromEntries(PROPERTY_TYPE_OPTIONS.map((o) => [o.value, o.label])) as Record<
    PropertyType,
    string
  >,
  furnishing: Object.fromEntries(FURNISHING_OPTIONS.map((o) => [o.value, o.label])) as Record<
    Furnishing,
    string
  >,
  parking: Object.fromEntries(PARKING_OPTIONS.map((o) => [o.value, o.label])) as Record<ParkingType, string>,
  roomType: Object.fromEntries(ROOM_TYPE_OPTIONS.map((o) => [o.value, o.label])) as Record<RoomType, string>,
  gender: Object.fromEntries(GENDER_OPTIONS.map((o) => [o.value, o.label])) as Record<GenderPreference, string>,
};
