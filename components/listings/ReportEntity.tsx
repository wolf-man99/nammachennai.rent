'use client';

import { useState } from 'react';
import { REPORT_REASONS } from '@/lib/constants';
import { useSubmit } from '@/components/forms/useSubmit';
import type { EntityType } from '@/types';

/** Every user-generated surface carries the same one-tap report control. */
export function ReportEntity({ entityType, entityId }: { entityType: EntityType; entityId: string }) {
  const { submit, loading, data } = useSubmit<{ id: string }>('/api/reports');
  const [open, setOpen] = useState(false);

  if (data) return <p className="text-xs text-muted">Thanks — our team will review this.</p>;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="tap inline-block text-xs text-faint underline-offset-4 transition-colors hover:text-ink hover:underline"
      >
        Report this listing
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted">Why?</span>
      {REPORT_REASONS.map((r) => (
        <button
          key={r.value}
          type="button"
          disabled={loading}
          onClick={() => submit({ entity_type: entityType, entity_id: entityId, reason: r.value })}
          className="rounded-pill border border-line-strong px-3.5 py-2 text-xs font-medium transition-colors hover:border-ink disabled:opacity-50"
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
