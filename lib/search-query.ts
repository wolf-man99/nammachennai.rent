import { BHK_VALUES } from '@/lib/constants';
import type { Bhk } from '@/types';

export interface ParsedQuery {
  /** The locality text left after structured tokens are removed. */
  text: string;
  bhk: Bhk | null;
  maxRent: number | null;
}

const BHK_PATTERNS: [RegExp, Bhk][] = [
  [/\b1\s*rk\b/i, '1RK'],
  [/\b(?:1|one)\s*bhk\b/i, '1BHK'],
  [/\b(?:2|two)\s*bhk\b/i, '2BHK'],
  [/\b(?:3|three)\s*bhk\b/i, '3BHK'],
  [/\b(?:4|four)\s*\+?\s*bhk\b/i, '4BHK+'],
];

/** Understands "2 BHK OMR under 30k" without needing a query language. */
export function parseSearch(input: string): ParsedQuery {
  let text = input.trim();
  let bhk: Bhk | null = null;
  let maxRent: number | null = null;

  for (const [pattern, value] of BHK_PATTERNS) {
    if (pattern.test(text)) {
      bhk = value;
      text = text.replace(pattern, ' ');
      break;
    }
  }

  const budget = text.match(/(?:under|below|upto|up to|max|<)?\s*(?:₹|rs\.?)?\s*(\d+(?:\.\d+)?)\s*(k|l|lakh|thousand)?\b/i);
  if (budget) {
    const raw = parseFloat(budget[1]);
    const unit = (budget[2] || '').toLowerCase();
    let value = raw;
    if (unit === 'k' || unit === 'thousand') value = raw * 1000;
    else if (unit === 'l' || unit === 'lakh') value = raw * 100_000;
    // Only treat it as a budget when it reads like money, not a house number.
    if (value >= 3000 && value <= 1_500_000) {
      maxRent = Math.round(value);
      text = text.replace(budget[0], ' ');
    }
  }

  text = text.replace(/\b(under|below|upto|up to|max|rent|in|for|flat|home|house|apartment)\b/gi, ' ');
  text = text.replace(/\s+/g, ' ').trim();

  return { text, bhk, maxRent };
}

/**
 * Folds the spelling variance common in Tamil place names so a renter finds
 * their locality however they type it.
 *
 *   Velachery / Velacheri        Sholinganallur / Solinganallur
 *   Iyyappanthangal / Iyappanthangal      Pazhavanthangal / Palavanthangal
 *
 * Deliberately lossy: it only has to bring two spellings of the same place
 * together, never to be reversible.
 */
export function foldLocalityName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z]/g, '')
    .replace(/zh/g, 'l') // ழ romanises as zh or l
    .replace(/sh/g, 's') // Sholinganallur / Solinganallur
    .replace(/th/g, 't') // aspirated consonants are written both ways
    .replace(/dh/g, 'd')
    .replace(/y/g, 'i') // y and i are interchangeable in transliteration
    .replace(/(.)\1+/g, '$1'); // doubled consonants are inconsistent
}

/** True when a locality name plausibly matches what someone typed. */
export function localityMatches(name: string, zone: string | null, query: string): boolean {
  const q = query.trim();
  if (!q) return false;
  const lower = name.toLowerCase();
  if (lower.includes(q.toLowerCase())) return true;
  if ((zone ?? '').toLowerCase().includes(q.toLowerCase())) return true;
  const folded = foldLocalityName(q);
  return folded.length >= 3 && foldLocalityName(name).includes(folded);
}

export function isBhk(value: string): value is Bhk {
  return (BHK_VALUES as string[]).includes(value);
}
