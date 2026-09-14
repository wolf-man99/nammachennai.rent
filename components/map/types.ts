export interface LocalityPuck {
  slug: string;
  name: string;
  /** Formatted median, or null when the sample is too thin to publish one. */
  label: string | null;
  lat: number;
  lng: number;
  reports: number;
}
