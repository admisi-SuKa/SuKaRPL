"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveProgramSettingsAction } from "../actions";

export function SettingsForm({ initialName, initialNip }: { initialName?: string | null; initialNip?: string | null }) {
  const router = useRouter();
  const [name, setName] = useState(initialName || "");
  const [nip, setNip] = useState(initialNip || "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <section className="rpl-card p-5">
      <h2 className="font-black text-[var(--rpl-green-950)]">Identitas Ketua Program Studi</h2>
      <p className="mt-1 text-xs text-[var(--muted)]">Digunakan otomatis pada Berita Acara hasil asesmen.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_220px_auto] sm:items-end"><div><label className="rpl-label">Nama Ketua Prodi</label><input className="rpl-input" value={name} onChange={(e) => setName(e.target.value)} /></div><div><label className="rpl-label">NIP</label><input className="rpl-input" value={nip} onChange={(e) => setNip(e.target.value)} /></div><button type="button" disabled={pending} className="rpl-btn rpl-btn-primary" onClick={() => startTransition(async () => { const r = await saveProgramSettingsAction(name, nip); setMessage(r.ok ? "Tersimpan." : r.error || "Gagal menyimpan."); if (r.ok) router.refresh(); })}><i className="bi bi-check2" /> Simpan</button></div>
      {message && <div className="mt-2 text-xs font-bold text-[var(--muted)]">{message}</div>}
    </section>
  );
}
