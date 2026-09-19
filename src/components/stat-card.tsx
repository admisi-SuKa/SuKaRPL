export function StatCard({ icon, label, value, hint }: { icon: string; label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rpl-card p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--rpl-green-50)] text-[var(--rpl-green-800)]">
          <i className={`bi ${icon} text-lg`} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-bold text-[var(--muted)]">{label}</div>
          <div className="mt-1 text-2xl font-black text-[var(--rpl-green-950)]">{value}</div>
          {hint && <div className="mt-1 text-[11px] leading-4 text-[#82928e]">{hint}</div>}
        </div>
      </div>
    </div>
  );
}
