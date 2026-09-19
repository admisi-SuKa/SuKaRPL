export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="inline-flex items-center gap-2.5" aria-label="SuKaRPL">
      <img
        src="/rpl-logo.png"
        alt="Logo RPL"
        className={compact ? "h-8 w-[76px] object-contain" : "h-12 w-[116px] object-contain"}
      />
      {!compact && (
        <div className="leading-none">
          <div className="text-[1.15rem] font-black tracking-tight text-[var(--rpl-green-950)]">SuKa<span className="text-[var(--rpl-orange)]">RPL</span></div>
          <div className="mt-1 text-[10px] font-bold tracking-[.12em] text-[var(--muted)] uppercase">Rekognisi Pembelajaran Lampau</div>
        </div>
      )}
    </div>
  );
}
