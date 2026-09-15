'use client';

import { useEffect } from 'react';

/**
 * Remembers this dashboard on this device.
 *
 * We cannot resend the link - only its hash is stored - so the browser holding
 * a copy is the difference between an owner getting back in and losing access.
 */
export function RememberLink({ token }: { token: string }) {
  useEffect(() => {
    try {
      localStorage.setItem('ric_manage_token', token);
    } catch {
      /* private browsing or blocked storage - nothing to do */
    }
  }, [token]);

  return null;
}
