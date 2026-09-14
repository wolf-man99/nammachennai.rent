'use client';

import type { EventName } from './events';

/**
 * One call site for analytics.
 *
 * PostHog when a key is configured, GA4 when a measurement id is, and always a
 * first-party write so the funnel survives an ad blocker.
 */

type Props = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    posthog?: { capture: (event: string, props?: Props) => void };
    gtag?: (command: string, event: string, props?: Props) => void;
  }
}

export function track(name: EventName, props: Props = {}) {
  if (typeof window === 'undefined') return;

  try {
    window.posthog?.capture(name, props);
    window.gtag?.('event', name, props);
  } catch {
    // Analytics must never break a form submit.
  }

  const body = JSON.stringify({ name, props });
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/events', new Blob([body], { type: 'application/json' }));
    } else {
      void fetch('/api/events', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
        keepalive: true,
      });
    }
  } catch {
    /* ignore */
  }
}
