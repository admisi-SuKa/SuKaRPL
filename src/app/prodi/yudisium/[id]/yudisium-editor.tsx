"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { finalizeYudisiumAction, reopenYudisiumAction, saveYudisiumAction } from "../../actions";

type Claim = { id: string; code: string; name: string; credits: number; assessmentType: string; a1: string; a2: string; current?: "YA" | "TIDAK" };

export function YudisiumEditor({ applicationId, status, claims }: { applicationId: string; status: string; claims: Claim[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [decisions, setDecisions] = useState<Record<string, "YA" | "TIDAK" | "">>(() => Object.fromEntries(claims.map((c) => [c.id, c.current || ""])));

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    setMsg(null);
    startTransition(async () => { const r = await fn(); setMsg(r.ok ? { ok: true, text: success } : { ok: false, text: r.error || "Gagal memproses." }); if (r.ok) router.refresh(); });
  }
  const final = status === "FINAL";
  const complete = claims.every((c) => decisions[c.id] === "YA" || decisions[c.id] === "TIDAK");

  return (
    <div className="space-y-4">
      {msg && <div className={`rounded-xl border p-3 text-sm font-bold ${msg.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>{msg.text}</div>}
      <section className="rpl-card overflow-hidden">
        <div className="border-b border-[var(--line)] p-4 sm:p-5"><h2 className="font-black text-[var(--rpl-green-950)]">Keputusan Mata Kuliah</h2><p className="mt-1 text-xs text-[var(--muted)]">Nilai yang ditampilkan adalah rerata nilai yang sudah diisi masing-masing asesor.</p></div>
        <div className="divide-y divide-[var(--line)]">{claims.map((claim) => <div key={claim.id} className="p-4 sm:p-5"><div className="flex flex-col gap-4 xl:flex-row xl:items-center"><div className="min-w-0 flex-1"><div className="flex flex-wrap gap-2"><span className="text-xs font-black text-[var(--rpl-green-800)]">{claim.code}</span><span className="rpl-pill bg-[#f0f6f4] text-[#5c706b]">{claim.credits} SKS</span><span className="rpl-pill bg-[#f0f6f4] text-[#5c706b]">{claim.assessmentType}</span></div><div className="mt-1 font-black">{claim.name}</div></div><div className="grid grid-cols-2 gap-2 text-center sm:w-64"><div className="rounded-xl bg-[#f6faf9] p-2"><div className="text-[10px] font-bold text-[var(--muted)]">Asesor 1</div><div className="font-black">{claim.a1 || "Belum lengkap"}</div></div><div className="rounded-xl bg-[#f6faf9] p-2"><div className="text-[10px] font-bold text-[var(--muted)]">Asesor 2</div><div className="font-black">{claim.a2 || "Belum lengkap"}</div></div></div><div className="flex gap-2"><label className={`cursor-pointer rounded-xl border px-4 py-2 text-sm font-black ${decisions[claim.id] === "YA" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-[var(--line)]"}`}><input className="sr-only" type="radio" disabled={final} checked={decisions[claim.id] === "YA"} onChange={() => setDecisions({ ...decisions, [claim.id]: "YA" })} />YA</label><label className={`cursor-pointer rounded-xl border px-4 py-2 text-sm font-black ${decisions[claim.id] === "TIDAK" ? "border-red-200 bg-red-50 text-red-700" : "border-[var(--line)]"}`}><input className="sr-only" type="radio" disabled={final} checked={decisions[claim.id] === "TIDAK"} onChange={() => setDecisions({ ...decisions, [claim.id]: "TIDAK" })} />TIDAK</label></div></div></div>)}</div>
      </section>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        {!final && <button className="rpl-btn rpl-btn-secondary" disabled={pending} onClick={() => run(() => saveYudisiumAction(applicationId, Object.entries(decisions).filter(([,r]) => r).map(([claimId,result]) => ({ claimId, result: result as "YA" | "TIDAK" }))), "Draft yudisium tersimpan.")}><i className="bi bi-floppy" /> Simpan Draft</button>}
        {!final && <button className="rpl-btn rpl-btn-primary" disabled={pending || !complete} onClick={() => { if (window.confirm("Finalisasi hasil yudisium? Setelah final, hasil akan terlihat oleh mahasiswa.")) run(async () => { const saved = await saveYudisiumAction(applicationId, Object.entries(decisions).map(([claimId,result]) => ({ claimId, result: result as "YA" | "TIDAK" }))); if (!saved.ok) return saved; return finalizeYudisiumAction(applicationId); }, "Yudisium berhasil difinalisasi."); }}><i className="bi bi-patch-check" /> Finalisasi</button>}
        {final && <><a className="rpl-btn rpl-btn-secondary" href={`/api/berita-acara/${applicationId}`} target="_blank" rel="noopener noreferrer"><i className="bi bi-file-earmark-pdf" /> Berita Acara PDF</a><button className="rpl-btn rpl-btn-danger" disabled={pending} onClick={() => { if (window.confirm("Batalkan status final dan kembali ke draft yudisium?")) run(() => reopenYudisiumAction(applicationId), "Finalisasi dibatalkan."); }}><i className="bi bi-arrow-counterclockwise" /> Batalkan Final</button></>}
      </div>
    </div>
  );
}
