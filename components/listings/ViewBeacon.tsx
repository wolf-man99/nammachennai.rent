'use client';

import { useEffect } from 'react';

/** Registers one view of a property page. Deduplicated per viewer per day server-side. */
export function ViewBeacon({ listingId }: { listingId: string }) {
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/listings/${listingId}/view`, {
      method: 'POST',
      signal: controller.signal,
      keepalive: true,
    }).catch(() => {
      /* a missed view must never surface to the visitor */
    });
    return () => controller.abort();
  }, [listingId]);

  return null;
}
