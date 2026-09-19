export function BrandLogo({ compact = false }: { compact?: boolean }) {
  const size = compact ? 38 : 46;
  return (
    <div className="inline-flex items-center gap-2.5" aria-label="SuKaRPL">
      <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label="Logo RPL">
        <rect x="2" y="2" width="44" height="44" rx="12" fill="#075b52" />
        <path d="M33 2h13v13L33 2Z" fill="#f97316" />
        <path d="M2 35l11 11H2V35Z" fill="#f59e0b" />
        <text x="7" y="30.5" fill="white" fontSize="16.5" fontWeight="900" fontFamily="Arial, Helvetica, sans-serif" letterSpacing="-.8">RPL</text>
      </svg>
      {!compact && (
        <div className="leading-none">
          <div className="text-[1.15rem] font-black tracking-tight text-[var(--rpl-green-950)]">SuKa<span className="text-[var(--rpl-orange)]">RPL</span></div>
          <div className="mt-1 text-[10px] font-bold tracking-[.12em] text-[var(--muted)] uppercase">Rekognisi Pembelajaran Lampau</div>
        </div>
      )}
    </div>
  );
}
