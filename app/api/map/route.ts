import { ok } from '@/lib/api';
import { getMapPoints } from '@/services/map';
import { BHK_VALUES } from '@/lib/constants';
import type { Bhk, Furnishing, PropertyType } from '@/types';

export const runtime = 'nodejs';
export const revalidate = 120;

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;

  const kinds = p.getAll('kind').filter((k): k is 'rent' | 'listing' | 'tolet' =>
    ['rent', 'listing', 'tolet'].includes(k),
  );
  const bhk = p.getAll('bhk').filter((b): b is Bhk => (BHK_VALUES as string[]).includes(b));
  const furnishing = p.getAll('furnishing') as Furnishing[];
  const propertyType = p.getAll('propertyType') as PropertyType[];

  const points = await getMapPoints({
    kinds: kinds.length ? kinds : undefined,
    bhk: bhk.length ? bhk : undefined,
    furnishing: furnishing.length ? furnishing : undefined,
    propertyType: propertyType.length ? propertyType : undefined,
    minRent: Number(p.get('minRent')) || undefined,
    maxRent: Number(p.get('maxRent')) || undefined,
  });

  return ok(points);
}
