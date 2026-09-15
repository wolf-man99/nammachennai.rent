import Link from 'next/link';

export function Logo({ dark = false, className = '' }: { dark?: boolean; className?: string }) {
  return (
    <Link href="/" className={`group inline-flex items-center gap-2.5 py-2 ${className}`} aria-label="Rent In Chennai home">
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
      <span className={`text-[0.9375rem] font-semibold tracking-tight sm:text-[1.0625rem] ${dark ? 'text-white' : 'text-ink'}`}>
        Rent<Dot dark={dark} />In<Dot dark={dark} />Chennai
      </span>
    </Link>
  );
}

/** The separators carry the muted tone the rest of the system uses for secondary text. */
function Dot({ dark }: { dark: boolean }) {
  return <span className={dark ? 'text-white/40' : 'text-faint'}>.</span>;
}
