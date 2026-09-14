import { db } from '@/lib/db';
import type { EventName } from './events';

/** Server-side event write. Fire and forget - never awaited on a user path. */
export function recordEvent(name: EventName | string, props: Record<string, unknown> = {}) {
  void db()
    .insert('events', { name, props })
    .catch(() => {
      /* analytics is best effort */
    });
}
