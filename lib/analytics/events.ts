/** The product's event vocabulary. One place, so naming never drifts. */
export const EVENTS = [
  'page_view',
  'locality_search',
  'map_open',
  'map_filter_used',
  'rent_submission_started',
  'rent_submission_completed',
  'listing_started',
  'listing_completed',
  'seeker_started',
  'seeker_completed',
  'contact_owner',
  'match_created',
  'flatmate_submission',
  'tolet_submission',
  'report_submitted',
] as const;

export type EventName = (typeof EVENTS)[number];
