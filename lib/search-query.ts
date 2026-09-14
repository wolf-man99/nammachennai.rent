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

export function isBhk(value: string): value is Bhk {
  return (BHK_VALUES as string[]).includes(value);
}
