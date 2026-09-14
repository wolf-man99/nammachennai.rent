/**
 * Single source of truth for table + column names.
 *
 * Every field name that reaches a SQL string is checked against this map, so a
 * filter built from user input can never become an identifier injection.
 */

export const TABLES = {
  users: ['id', 'name', 'email', 'phone', 'role', 'created_at'],
  localities: ['id', 'city', 'name', 'slug', 'latitude', 'longitude', 'zone', 'tier', 'created_at'],
  rent_submissions: [
    'id', 'user_id', 'city', 'locality_id', 'latitude', 'longitude', 'bhk', 'property_type',
    'rent', 'maintenance', 'furnishing', 'floor', 'parking', 'society', 'move_in_date',
    'comments', 'verification_status', 'submitter_hash', 'created_at',
  ],
  listings: [
    'id', 'owner_id', 'city', 'locality_id', 'latitude', 'longitude', 'bhk', 'property_type',
    'rent', 'maintenance', 'deposit', 'furnishing', 'parking', 'area_sqft', 'available_from',
    'title', 'description', 'status', 'verification_status', 'owner_name', 'owner_phone',
    'owner_email', 'created_at', 'expires_at',
  ],
  listing_photos: ['id', 'listing_id', 'url', 'position', 'created_at'],
  seekers: [
    'id', 'city', 'locality_id', 'latitude', 'longitude', 'radius_km', 'min_rent', 'max_rent',
    'bhk', 'furnishing', 'property_type', 'move_in_date', 'room_or_full', 'contact_name',
    'contact_phone', 'contact_email', 'created_at',
  ],
  matches: ['id', 'seeker_id', 'listing_id', 'match_score', 'distance_km', 'created_at', 'contacted_at'],
  flatmate_listings: [
    'id', 'user_id', 'city', 'locality_id', 'latitude', 'longitude', 'rent', 'room_type',
    'total_bhk', 'gender_preference', 'furnishing', 'move_in_date', 'description', 'status',
    'verification_status', 'contact_name', 'contact_phone', 'contact_email', 'created_at',
  ],
  tolet_reports: [
    'id', 'city', 'locality_id', 'latitude', 'longitude', 'photo', 'rent', 'bhk', 'phone',
    'landmark', 'seen_at', 'status', 'created_at',
  ],
  reports: ['id', 'entity_type', 'entity_id', 'reason', 'description', 'created_at'],
  events: ['id', 'name', 'props', 'created_at'],
} as const;

export type TableName = keyof typeof TABLES;

/** Columns holding JSON rather than a scalar - the file store must not stringify twice. */
export const JSON_COLUMNS: Partial<Record<TableName, string[]>> = {
  events: ['props'],
};

export function assertColumn(table: TableName, column: string): string {
  const cols = TABLES[table] as readonly string[];
  if (!cols.includes(column)) {
    throw new Error(`Unknown column "${column}" on table "${table}"`);
  }
  return column;
}
