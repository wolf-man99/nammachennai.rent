/**
 * The designed stand-in for a home without photos.
 *
 * Most owner listings arrive without images; a grey box would make the whole
 * product look broken, so this draws a deterministic bar texture from the id.
 */
export function NoPhoto({
  bhk,
  seed,
  size = 'md',
}: {
  bhk: string;
  seed: string;
  size?: 'md' | 'lg';
}) {
  const count = size === 'lg' ? 48 : 26;
  const bars = Array.from({ length: count }, (_, i) => ((seed.charCodeAt(i % seed.length) * (i + 7)) % 70) + 22);

  return (
    <div className="absolute inset-0 flex flex-col justify-between bg-gradient-to-br from-surface-sunk to-ground p-5 sm:p-7">
      <span
        className={`font-semibold leading-none tracking-tight text-ink/12 ${
          size === 'lg' ? 'text-display' : 'text-[2.75rem]'
        }`}
      >
        {bhk}
      </span>
      <div className={`flex items-end gap-[3px] ${size === 'lg' ? 'h-24' : 'h-12'}`}>
        {bars.map((h, i) => (
          <div key={i} className="flex-1 rounded-full bg-ink/10" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}
