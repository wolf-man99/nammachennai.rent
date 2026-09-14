import { z } from 'zod';
import { BHK_VALUES, DEPOSIT_MAX, MAINTENANCE_MAX, RENT_BOUNDS } from '@/lib/constants';

const bhk = z.enum(BHK_VALUES as [string, ...string[]]);
const propertyType = z.enum(['apartment', 'independent_house', 'villa', 'studio', 'gated_community']);
const furnishing = z.enum(['unfurnished', 'semi_furnished', 'fully_furnished']);
const parking = z.enum(['none', 'two_wheeler', 'car', 'both']);

const rent = z
  .number({ invalid_type_error: 'Enter a rent amount' })
  .int()
  .min(RENT_BOUNDS.min, `Rent below ₹${RENT_BOUNDS.min.toLocaleString('en-IN')} looks like a typo`)
  .max(RENT_BOUNDS.max, 'That rent looks out of range');

const optionalMoney = (max: number) => z.number().int().min(0).max(max).nullable().optional();
const optionalText = (max: number) => z.string().trim().max(max).nullable().optional();
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date')
  .nullable()
  .optional();

const phone = z
  .string()
  .trim()
  .regex(/^(\+91[\s-]?)?[6-9]\d{9}$/, 'Enter a valid 10 digit Indian mobile number');

const email = z.string().trim().email('Enter a valid email').max(160);

const coords = {
  latitude: z.number().min(11.5).max(14.5).nullable().optional(),
  longitude: z.number().min(79).max(81.5).nullable().optional(),
};

export const rentSubmissionSchema = z.object({
  locality_slug: z.string().min(1, 'Pick a locality'),
  ...coords,
  bhk,
  property_type: propertyType,
  rent,
  maintenance: optionalMoney(MAINTENANCE_MAX),
  furnishing,
  floor: z.number().int().min(-2).max(80).nullable().optional(),
  parking: parking.nullable().optional(),
  society: optionalText(120),
  move_in_date: isoDate,
  comments: optionalText(500),
});

export const listingSchema = z.object({
  owner_name: z.string().trim().min(2, 'Tell renters who they are speaking to').max(80),
  owner_phone: phone,
  owner_email: email.optional().or(z.literal('')),
  locality_slug: z.string().min(1, 'Pick a locality'),
  ...coords,
  property_type: propertyType,
  bhk,
  rent,
  maintenance: optionalMoney(MAINTENANCE_MAX),
  deposit: optionalMoney(DEPOSIT_MAX),
  furnishing,
  parking: parking.nullable().optional(),
  area_sqft: z.number().int().min(80).max(20000).nullable().optional(),
  available_from: isoDate,
  title: optionalText(90),
  description: optionalText(1500),
  photos: z.array(z.string().max(400)).max(8).optional(),
});

export const seekerSchema = z.object({
  locality_slug: z.string().min(1, 'Pick a locality'),
  ...coords,
  radius_km: z.number().min(1).max(25).default(5),
  min_rent: optionalMoney(RENT_BOUNDS.max),
  max_rent: rent,
  bhk,
  furnishing: furnishing.nullable().optional(),
  property_type: propertyType.nullable().optional(),
  move_in_date: isoDate,
  room_or_full: z.enum(['room', 'full']).default('full'),
  contact_name: z.string().trim().min(2, 'Add your name').max(80),
  contact_phone: phone,
  contact_email: email.optional().or(z.literal('')),
});

export const flatmateSchema = z.object({
  locality_slug: z.string().min(1, 'Pick a locality'),
  ...coords,
  rent,
  room_type: z.enum(['private_room', 'shared_room', 'full_flat']),
  total_bhk: bhk,
  gender_preference: z.enum(['any', 'male', 'female']).default('any'),
  furnishing,
  move_in_date: isoDate,
  description: optionalText(1000),
  contact_name: z.string().trim().min(2, 'Add your name').max(80),
  contact_phone: phone,
  contact_email: email.optional().or(z.literal('')),
});

export const toletSchema = z.object({
  locality_slug: z.string().min(1, 'Pick a locality'),
  ...coords,
  photo: z.string().max(400).nullable().optional(),
  rent: z.number().int().min(RENT_BOUNDS.min).max(RENT_BOUNDS.max).nullable().optional(),
  bhk: bhk.nullable().optional(),
  phone: phone.nullable().optional().or(z.literal('')),
  landmark: optionalText(160),
  seen_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const reportSchema = z.object({
  entity_type: z.enum(['listing', 'rent_submission', 'tolet_report', 'flatmate_listing']),
  entity_id: z.string().min(1),
  reason: z.string().min(1).max(40),
  description: optionalText(500),
});

export const contactRequestSchema = z.object({
  name: z.string().trim().min(2, 'Add your name').max(80),
  phone,
});

export type RentSubmissionInput = z.infer<typeof rentSubmissionSchema>;
export type ListingInput = z.infer<typeof listingSchema>;
export type SeekerInput = z.infer<typeof seekerSchema>;
export type FlatmateInput = z.infer<typeof flatmateSchema>;
export type ToletInput = z.infer<typeof toletSchema>;

/** Flatten a ZodError into the { field: message } shape the forms render. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'form';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
