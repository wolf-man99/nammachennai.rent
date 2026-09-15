'use client';

import { useEffect, useState } from 'react';

/**
 * The one moment the owner sees their dashboard link.
 *
 * Only the hash is stored, so this cannot be shown again. The copy says so
 * plainly, and the browser keeps a copy as a safety net.
 */
export function DashboardLink({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState(`/manage/${token}`);

  useEffect(() => {
    setUrl(`${window.location.origin}/manage/${token}`);
    try {
      localStorage.setItem('ric_manage_token', token);
    } catch {
      /* blocked storage is not worth surfacing here */
    }
  }, [token]);

  return (
    <div className="mt-8 rounded-panel border border-owner-ink/25 bg-owner-soft p-6 text-left">
      <p className="eyebrow text-owner-ink">Your dashboard — save this link</p>
      <p className="mt-3 text-sm leading-relaxed text-ink/75">
        See who viewed your home and who asked for your number. No account and no password — the
        link is the key, so keep it to yourself. We cannot send it to you again.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-field border border-owner-ink/20 bg-white/70 px-3.5 py-2.5 text-xs text-ink">
          {url}
        </code>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              setCopied(false);
            }
          }}
          className="shrink-0 rounded-pill bg-ink px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ink-soft"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <a
        href={url}
        className="mt-4 inline-block text-sm font-semibold text-ink underline-offset-4 hover:underline"
      >
        Open my dashboard →
      </a>
    </div>
  );
}
