'use client';

import { useState } from 'react';

interface State<T> {
  loading: boolean;
  error: string | null;
  errors: Record<string, string>;
  data: T | null;
}

type ApiSuccess<T> = { ok: true; data: T };
type ApiFailure = { ok: false; message: string; errors?: Record<string, string> };

/**
 * One submit hook for every form: posts JSON, surfaces field errors, returns data.
 *
 * It is careful to diagnose failures honestly. Telling someone to "check your
 * connection" when the server threw a 500 sends them to debug the wrong thing,
 * so a network failure, an HTTP error and an unreadable body each say what they
 * actually are.
 */
export function useSubmit<T>(url: string) {
  const [state, setState] = useState<State<T>>({
    loading: false,
    error: null,
    errors: {},
    data: null,
  });

  function failWith(message: string, errors: Record<string, string> = {}) {
    setState({ loading: false, error: message, errors, data: null });
    return null;
  }

  async function submit(body: unknown): Promise<T | null> {
    setState({ loading: true, error: null, errors: {}, data: null });

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch {
      // fetch only rejects on a genuine transport failure.
      const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
      return failWith(
        offline
          ? 'You appear to be offline. Reconnect and try again — nothing was lost.'
          : 'Could not reach the server. Check your connection and try again.',
      );
    }

    let payload: ApiSuccess<T> | ApiFailure | null = null;
    try {
      payload = (await res.json()) as ApiSuccess<T> | ApiFailure;
    } catch {
      payload = null; // Not JSON — an error page, a proxy, or an empty body.
    }

    if (payload && payload.ok === false) {
      return failWith(payload.message || 'That could not be saved. Please try again.', payload.errors ?? {});
    }

    if (!res.ok) {
      if (res.status === 429) {
        const retryAfter = Number(res.headers.get('retry-after')) || 0;
        const wait = retryAfter > 60 ? `${Math.ceil(retryAfter / 60)} minutes` : 'a moment';
        return failWith(`Too many submissions from here. Please wait ${wait} and try again.`);
      }
      if (res.status >= 500) {
        return failWith('Something went wrong at our end. Please try again in a moment.');
      }
      return failWith(`That could not be saved (error ${res.status}). Please try again.`);
    }

    if (!payload || payload.ok !== true) {
      return failWith('We got an unexpected response from the server. Please try again.');
    }

    setState({ loading: false, error: null, errors: {}, data: payload.data });
    return payload.data;
  }

  return { ...state, submit };
}
