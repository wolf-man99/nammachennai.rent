/** Core domain types for Chennai.rent. City-scoped from day one so expansion is a data change. */

export type City = 'chennai';

export type Bhk = '1RK' | '1BHK' | '2BHK' | '3BHK' | '4BHK+';

export type PropertyType = 'apartment' | 'independent_house' | 'villa' | 'studio' | 'gated_community';

export type Furnishing = 'unfurnished' | 'semi_furnished' | 'fully_furnished';

export type ParkingType = 'none' | 'two_wheeler' | 'car' | 'both';

export type VerificationStatus = 'pending' | 'verified' | 'unverified' | 'rejected';

export type ListingStatus = 'active' | 'rented' | 'expired' | 'hidden';

export type ToletStatus = 'active' | 'rented' | 'stale' | 'invalid';

export type RoomType = 'private_room' | 'shared_room' | 'full_flat';

export type GenderPreference = 'any' | 'male' | 'female';

export type EntityType = 'listing' | 'rent_submission' | 'tolet_report' | 'flatmate_listing';

export type UserRole = 'renter' | 'owner' | 'admin';

export interface Locality {
  id: string;
  city: City;
  name: string;
  slug: string;
  latitude: number;
  longitude: number;
  /** Editorial grouping, e.g. "OMR", "Velachery Belt". Used for corridor pages + nearby logic. */
  zone: string | null;
  tier: 1 | 2 | 3;
  created_at: string;
}

export interface RentSubmission {
  id: string;
  user_id: string | null;
  city: City;
  locality_id: string;
  latitude: number | null;
  longitude: number | null;
  bhk: Bhk;
  property_type: PropertyType;
  rent: number;
  maintenance: number | null;
  furnishing: Furnishing;
  floor: number | null;
  parking: ParkingType | null;
  society: string | null;
  move_in_date: string | null;
  comments: string | null;
  verification_status: VerificationStatus;
  /** Never exposed publicly. Used only for duplicate / abuse detection. */
  submitter_hash: string | null;
  created_at: string;
}

export interface Listing {
  id: string;
  owner_id: string | null;
  city: City;
  locality_id: string;
  latitude: number | null;
  longitude: number | null;
  bhk: Bhk;
  property_type: PropertyType;
  rent: number;
  maintenance: number | null;
  deposit: number | null;
  furnishing: Furnishing;
  parking: ParkingType | null;
  area_sqft: number | null;
  available_from: string | null;
  title: string | null;
  description: string | null;
  status: ListingStatus;
  verification_status: VerificationStatus;
  /** Private. Served only through the server-side contact endpoint. */
  owner_name: string | null;
  owner_phone: string | null;
  owner_email: string | null;
  created_at: string;
  expires_at: string | null;
}

export interface ListingPhoto {
  id: string;
  listing_id: string;
  url: string;
  position: number;
  created_at: string;
}

export interface Seeker {
  id: string;
  city: City;
  locality_id: string;
  latitude: number | null;
  longitude: number | null;
  radius_km: number;
  min_rent: number | null;
  max_rent: number;
  bhk: Bhk;
  furnishing: Furnishing | null;
  property_type: PropertyType | null;
  move_in_date: string | null;
  room_or_full: 'room' | 'full';
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  created_at: string;
}

export interface Match {
  id: string;
  seeker_id: string;
  listing_id: string;
  match_score: number;
  distance_km: number;
  created_at: string;
  contacted_at: string | null;
}

export interface FlatmateListing {
  id: string;
  user_id: string | null;
  city: City;
  locality_id: string;
  latitude: number | null;
  longitude: number | null;
  rent: number;
  room_type: RoomType;
  total_bhk: Bhk;
  gender_preference: GenderPreference;
  furnishing: Furnishing;
  move_in_date: string | null;
  description: string | null;
  status: ListingStatus;
  verification_status: VerificationStatus;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  created_at: string;
}

export interface ToletReport {
  id: string;
  city: City;
  locality_id: string;
  latitude: number | null;
  longitude: number | null;
  photo: string | null;
  rent: number | null;
  bhk: Bhk | null;
  /** Private: the number printed on the board. Revealed through the contact endpoint only. */
  phone: string | null;
  landmark: string | null;
  seen_at: string;
  status: ToletStatus;
  created_at: string;
}

export interface Report {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  reason: string;
  description: string | null;
  created_at: string;
}

export interface AppUser {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: UserRole;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/* Derived / view models                                               */
/* ------------------------------------------------------------------ */

/** Statistics are only ever emitted when the underlying sample clears a threshold. */
export interface RentStats {
  sample: number;
  median: number;
  p25: number;
  p75: number;
  min: number;
  max: number;
  mean: number;
}

export interface LocalityStats {
  locality: Locality;
  /** null when there is not enough renter data to say anything honest. */
  overall: RentStats | null;
  byBhk: Partial<Record<Bhk, RentStats>>;
  listingCount: number;
  toletCount: number;
  reportCount: number;
  /** Percent change of the median between the two most recent comparable windows. */
  trend: { pct: number; from: number; to: number } | null;
}

export interface TrendPoint {
  label: string;
  value: number | null;
  sample: number;
}

/** A listing as it is safe to serve to the public. */
export type PublicListing = Omit<Listing, 'owner_phone' | 'owner_email' | 'owner_name' | 'owner_id'> & {
  locality: Locality | null;
  photos: string[];
};

export type PublicFlatmateListing = Omit<
  FlatmateListing,
  'contact_phone' | 'contact_email' | 'contact_name' | 'user_id'
> & {
  locality: Locality | null;
};

export type PublicToletReport = Omit<ToletReport, 'phone'> & {
  locality: Locality | null;
  has_phone: boolean;
};

export interface MapPoint {
  id: string;
  kind: 'rent' | 'listing' | 'tolet';
  lat: number;
  lng: number;
  rent: number | null;
  bhk: Bhk | null;
  locality: string;
  locality_slug: string;
  href: string | null;
  label: string;
}
