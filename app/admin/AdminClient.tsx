'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/primitives';
import { Field, FormError, TextInput } from '@/components/forms/Fields';

export function LoginForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        const res = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ password }),
        });
        const json = (await res.json()) as { ok: boolean; message?: string };
        setLoading(false);
        if (json.ok) router.refresh();
        else setError(json.message ?? 'Login failed.');
      }}
      className="card mx-auto mt-16 max-w-sm p-8"
    >
      <h1 className="text-title font-semibold tracking-tight">Admin</h1>
      <p className="mt-2 text-sm text-muted">Moderation console for NammaChennai.rent.</p>

      {!configured ? (
        <p className="mt-6 rounded-field bg-warning-soft px-4 py-3 text-sm text-warning">
          ADMIN_PASSWORD is not set in the environment, so the console is disabled.
        </p>
      ) : null}

      <div className="mt-6 space-y-4">
        <Field label="Password">
          <TextInput
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </Field>
        <FormError message={error} />
        <Button type="submit" size="lg" disabled={loading || !configured} className="w-full">
          {loading ? 'Checking…' : 'Sign in'}
        </Button>
      </div>
    </form>
  );
}

export type AdminAction = 'approve' | 'reject' | 'flag' | 'mark_rented' | 'mark_stale' | 'delete' | 'restore';

const LABELS: Record<AdminAction, string> = {
  approve: 'Approve',
  reject: 'Reject',
  flag: 'Flag',
  mark_rented: 'Mark rented',
  mark_stale: 'Mark stale',
  delete: 'Delete',
  restore: 'Restore',
};

export function ActionBar({
  entity,
  id,
  actions,
}: {
  entity: string;
  id: string;
  actions: AdminAction[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  async function run(action: AdminAction) {
    if (action === 'delete' && !confirm('Delete this record permanently?')) return;
    setBusy(true);
    const res = await fetch('/api/admin/action', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ entity, id, action }),
    });
    const json = (await res.json()) as { ok: boolean; message?: string };
    setBusy(false);
    setDone(json.ok ? LABELS[action] : (json.message ?? 'Failed'));
    if (json.ok) startTransition(() => router.refresh());
  }

  if (done) return <span className="text-xs font-semibold text-success">{done}</span>;

  return (
    <div className="flex flex-wrap gap-1.5">
      {actions.map((a) => (
        <button
          key={a}
          type="button"
          disabled={busy || pending}
          onClick={() => run(a)}
          className={`rounded-pill border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-40 ${
            a === 'approve'
              ? 'border-success/30 text-success hover:bg-success-soft'
              : a === 'delete' || a === 'reject'
                ? 'border-error/30 text-error hover:bg-error-soft'
                : 'border-line-strong text-muted hover:border-ink hover:text-ink'
          }`}
        >
          {LABELS[a]}
        </button>
      ))}
    </div>
  );
}

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await fetch('/api/admin/logout', { method: 'POST' });
        router.refresh();
      }}
      className="text-sm font-semibold text-muted hover:text-ink"
    >
      Sign out
    </button>
  );
}
