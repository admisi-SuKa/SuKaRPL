"use client";

import { useActionState } from "react";
import { resetProdiPasswordAction, type AdminActionState } from "../actions";

const initialState: AdminActionState = {};

type Account = {
  id: string;
  full_name: string;
  email: string | null;
  active: boolean;
  program?: { name: string } | null;
};

export function ProdiAccountCard({ account }: { account: Account }) {
  const [state, action, pending] = useActionState(resetProdiPasswordAction, initialState);
  return (
    <form action={action} className="rpl-card p-4 sm:p-5">
      <input type="hidden" name="profileId" value={account.id} />
      <div className="flex items-start justify-between gap-3">
        <div><div className="text-xs font-black uppercase tracking-wide text-[var(--rpl-orange)]">{account.program?.name || "Program Studi"}</div><h2 className="mt-1 font-black text-[var(--rpl-green-950)]">{account.full_name}</h2><p className="mt-1 text-xs text-[var(--muted)]">{account.email || "Email internal tidak tersedia"}</p></div>
        <span className={`rpl-pill ${account.active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{account.active ? "Aktif" : "Nonaktif"}</span>
      </div>
      <div className="mt-4">
        <label className="rpl-label">Password baru (opsional)</label>
        <input name="password" type="text" className="rpl-input" placeholder="Kosongkan untuk generate otomatis" />
        <p className="mt-1 text-[11px] text-[var(--muted)]">Minimal 10 karakter jika ditentukan manual.</p>
      </div>
      {state.error && <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">{state.error}</div>}
      {state.ok && <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3"><div className="text-xs font-bold text-amber-900">{state.message}</div>{state.temporaryPassword && <div className="mt-2 rounded-lg bg-white px-3 py-2 font-mono font-black">{state.temporaryPassword}</div>}</div>}
      <button type="submit" disabled={pending} className="rpl-btn rpl-btn-secondary mt-4"><i className="bi bi-key" />{pending ? "Memproses..." : "Reset Password Prodi"}</button>
    </form>
  );
}
