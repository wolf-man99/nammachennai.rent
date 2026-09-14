'use client';

import { useState } from 'react';

interface State<T> {
  loading: boolean;
  error: string | null;
  errors: Record<string, string>;
  data: T | null;
}

/** One submit hook for every form: posts JSON, surfaces field errors, returns data. */
export function useSubmit<T>(url: string) {
  const [state, setState] = useState<State<T>>({
    loading: false,
    error: null,
    errors: {},
    data: null,
  });

  async function submit(body: unknown): Promise<T | null> {
    setState({ loading: true, error: null, errors: {}, data: null });
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as
        | { ok: true; data: T }
        | { ok: false; message: string; errors?: Record<string, string> };

      if (!res.ok || !json.ok) {
        const failure = json as { ok: false; message: string; errors?: Record<string, string> };
        setState({
          loading: false,
          error: failure.message || 'Something went wrong. Please try again.',
          errors: failure.errors ?? {},
          data: null,
        });
        return null;
      }

      setState({ loading: false, error: null, errors: {}, data: json.data });
      return json.data;
    } catch {
      setState({
        loading: false,
        error: 'Could not reach the server. Check your connection and try again.',
        errors: {},
        data: null,
      });
      return null;
    }
  }

  return { ...state, submit };
}
