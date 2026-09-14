import type { Metadata } from 'next';
import Link from 'next/link';
import { adminConfigured, isAdmin } from '@/lib/admin-auth';
import { getAdminMetrics, getAdminQueues } from '@/services/admin';
import { ActionBar, LoginForm, LogoutButton } from './AdminClient';
import { Container } from '@/components/ui/primitives';
import { LABELS } from '@/lib/constants';
import { formatDate, formatRent, relativeTime } from '@/lib/format';
import { usingPostgres } from '@/lib/db';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  if (!(await isAdmin())) {
    return (
      <Container>
        <LoginForm configured={adminConfigured()} />
      </Container>
    );
  }

  const [metrics, queues] = await Promise.all([getAdminMetrics(), getAdminQueues()]);

  return (
    <Container className="py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-title font-semibold tracking-tight">Moderation</h1>
          <p className="mt-1 text-sm text-muted">
            Storage: {usingPostgres() ? 'Postgres' : 'local file store (development)'}
          </p>
        </div>
        <LogoutButton />
      </div>

      {/* ------------------------------------------------- Metrics */}
      <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-panel border border-line bg-line sm:grid-cols-3 lg:grid-cols-5">
        {[
          ['Rent submissions', metrics.rentSubmissions],
          ['Pending rent', metrics.pendingRent],
          ['Active listings', metrics.activeListings],
          ['Pending listings', metrics.pendingListings],
          ['Seekers', metrics.seekers],
          ['Matches', metrics.matches],
          ['To-Let active', metrics.toletReports],
          ['To-Let stale', metrics.staleTolet],
          ['Flatmate posts', metrics.flatmates],
          ['User reports', metrics.reports],
        ].map(([label, value]) => (
          <div key={label as string} className="bg-surface px-5 py-4">
            <dt className="eyebrow text-faint">{label}</dt>
            <dd className="mt-2 text-2xl font-semibold tabular-nums">{Number(value).toLocaleString('en-IN')}</dd>
          </div>
        ))}
      </dl>

      {/* -------------------------------------------------- Queues */}
      <Queue title={`Pending rent submissions (${queues.rent.length})`}>
        {queues.rent.map((r) => (
          <Row
            key={r.id}
            primary={`${LABELS.bhk[r.bhk]} · ${r.localityName} · ${formatRent(r.rent)}`}
            secondary={`${LABELS.furnishing[r.furnishing]} · ${LABELS.propertyType[r.property_type]} · ${relativeTime(r.created_at)}${r.comments ? ` · “${r.comments}”` : ''}`}
            actions={<ActionBar entity="rent_submission" id={r.id} actions={['approve', 'flag', 'reject', 'delete']} />}
          />
        ))}
      </Queue>

      <Queue title={`Pending listings (${queues.listings.length})`}>
        {queues.listings.map((l) => (
          <Row
            key={l.id}
            primary={`${LABELS.bhk[l.bhk]} · ${l.localityName} · ${formatRent(l.rent)}`}
            secondary={`${l.owner_name ?? 'Owner'} · ${l.owner_phone ?? 'no phone'} · ${relativeTime(l.created_at)}`}
            href={`/property/${l.id}`}
            actions={
              <ActionBar entity="listing" id={l.id} actions={['approve', 'flag', 'mark_rented', 'reject', 'delete']} />
            }
          />
        ))}
      </Queue>

      <Queue title={`Reported content (${queues.reports.length})`}>
        {queues.reports.map((r) => (
          <Row
            key={r.id}
            primary={`${r.entity_type.replace('_', ' ')} · ${r.reason}`}
            secondary={`${r.entity_id} · ${relativeTime(r.created_at)}${r.description ? ` · ${r.description}` : ''}`}
            href={r.entity_type === 'listing' ? `/property/${r.entity_id}` : undefined}
            actions={<ActionBar entity="report" id={r.id} actions={['delete']} />}
          />
        ))}
      </Queue>

      <Queue title={`Stale To-Let boards (${queues.tolet.length})`}>
        {queues.tolet.map((t) => (
          <Row
            key={t.id}
            primary={`${t.localityName}${t.bhk ? ` · ${LABELS.bhk[t.bhk]}` : ''}${t.rent ? ` · ${formatRent(t.rent)}` : ''}`}
            secondary={`Seen ${formatDate(t.seen_at)} · ${t.landmark ?? 'no landmark'}`}
            actions={<ActionBar entity="tolet_report" id={t.id} actions={['mark_stale', 'mark_rented', 'reject', 'delete']} />}
          />
        ))}
      </Queue>

      <Queue title={`Pending flatmate posts (${queues.flatmates.length})`}>
        {queues.flatmates.map((f) => (
          <Row
            key={f.id}
            primary={`${LABELS.roomType[f.room_type]} · ${f.localityName} · ${formatRent(f.rent)}`}
            secondary={`${f.contact_name ?? ''} · ${relativeTime(f.created_at)}`}
            actions={<ActionBar entity="flatmate_listing" id={f.id} actions={['approve', 'flag', 'reject', 'delete']} />}
          />
        ))}
      </Queue>

      <Queue title={`Recent seekers (${queues.seekers.length})`}>
        {queues.seekers.map((s) => (
          <Row
            key={s.id}
            primary={`${LABELS.bhk[s.bhk]} in ${s.localityName} · up to ${formatRent(s.max_rent)}`}
            secondary={`${s.contact_name ?? ''} · ${s.contact_phone ?? ''} · ${s.radius_km} km · ${relativeTime(s.created_at)}`}
          />
        ))}
      </Queue>
    </Container>
  );
}

function Queue({ title, children }: { title: string; children: React.ReactNode }) {
  const items = Array.isArray(children) ? children : [children];
  return (
    <section className="mt-10">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>
      <div className="mt-3 overflow-hidden rounded-panel border border-line bg-surface">
        {items.filter(Boolean).length ? (
          <ul className="divide-y divide-line">{children}</ul>
        ) : (
          <p className="px-5 py-6 text-sm text-faint">Nothing in this queue.</p>
        )}
      </div>
    </section>
  );
}

function Row({
  primary,
  secondary,
  href,
  actions,
}: {
  primary: string;
  secondary: string;
  href?: string;
  actions?: React.ReactNode;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold tracking-tight">
          {href ? (
            <Link href={href} className="underline-offset-4 hover:underline">
              {primary}
            </Link>
          ) : (
            primary
          )}
        </p>
        <p className="mt-1 truncate text-xs text-faint">{secondary}</p>
      </div>
      {actions}
    </li>
  );
}
