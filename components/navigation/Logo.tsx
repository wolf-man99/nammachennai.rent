import Link from 'next/link';

export function Logo({ dark = false, className = '' }: { dark?: boolean; className?: string }) {
  return (
    <Link href="/" className={`group inline-flex items-center gap-2.5 py-2 ${className}`} aria-label="Chennai.rent home">
      <span className="flex items-end gap-[3px]" aria-hidden="true">
        {[9, 14, 20, 11].map((h, i) => (
          <span
            key={i}
            className={`w-[3px] rounded-full transition-all duration-300 ease-[var(--ease-out-soft)] ${
              i === 2 ? 'bg-data' : dark ? 'bg-white' : 'bg-ink'
            } group-hover:h-5`}
            style={{ height: h }}
          />
        ))}
      </span>
      <span className={`text-[1.0625rem] font-semibold tracking-tight ${dark ? 'text-white' : 'text-ink'}`}>
        Chennai<span className={dark ? 'text-white/45' : 'text-faint'}>.rent</span>
      </span>
    </Link>
  );
}
