"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { returnApplicationAction, saveAssignmentAction } from "../../actions";

type Assessor = { id: string; full_name: string; nip: string };

export function ParticipantControls({ applicationId, status, assessors, assignment, paymentStatus }: { applicationId: string; status: string; assessors: Assessor[]; assignment?: { assessor1_id: string; assessor2_id: string } | null; paymentStatus?: string | null }) {
  const router = useRouter();
  const [a1, setA1] = useState(assignment?.assessor1_id || "");
  const [a2, setA2] = useState(assignment?.assessor2_id || "");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const canAssign = !["DRAFT","RETURNED","FINAL"].includes(status) && (Boolean(assignment) || paymentStatus === "VERIFIED");
  const canReturn = !["DRAFT","RETURNED","FINAL"].includes(status);

  function execute(fn: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    setMsg(null);
    startTransition(async () => {
      const result = await fn();
      setMsg(result.ok ? { ok: true, text: success } : { ok: false, text: result.error || "Gagal memproses." });
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <section className="rpl-card p-5">
        <h2 className="font-black text-[var(--rpl-green-950)]">Plotting Asesor</h2>
        <p className="mt-1 text-xs text-[var(--muted)]">Tentukan dua asesor berbeda. Plotting baru aktif setelah pembayaran terverifikasi.</p>
        {!assignment && paymentStatus !== "VERIFIED" && <div className="mt-3 rounded-xl bg-amber-50 p-3 text-xs font-bold text-amber-800"><i className="bi bi-credit-card mr-1" /> Pembayaran belum terverifikasi.</div>}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div><label className="rpl-label">Asesor 1</label><select className="rpl-select" value={a1} disabled={!canAssign} onChange={(e) => setA1(e.target.value)}><option value="">Pilih asesor</option>{assessors.map((a) => <option key={a.id} value={a.id}>{a.full_name} — {a.nip}</option>)}</select></div>
          <div><label className="rpl-label">Asesor 2</label><select className="rpl-select" value={a2} disabled={!canAssign} onChange={(e) => setA2(e.target.value)}><option value="">Pilih asesor</option>{assessors.map((a) => <option key={a.id} value={a.id}>{a.full_name} — {a.nip}</option>)}</select></div>
        </div>
        <button type="button" className="rpl-btn rpl-btn-primary mt-4" disabled={!canAssign || pending} onClick={() => execute(() => saveAssignmentAction(applicationId, a1, a2), "Plotting asesor berhasil disimpan.")}><i className="bi bi-person-check" /> Simpan Plotting</button>
      </section>

      <section className="rpl-card p-5">
        <h2 className="font-black text-[var(--rpl-green-950)]">Kembalikan untuk Revisi</h2>
        <p className="mt-1 text-xs text-[var(--muted)]">Mahasiswa dapat mengubah MK dan bukti kembali setelah status RETURNED.</p>
        <textarea className="rpl-textarea mt-4" value={note} disabled={!canReturn} onChange={(e) => setNote(e.target.value)} placeholder="Tuliskan catatan perbaikan..." />
        <button type="button" className="rpl-btn rpl-btn-secondary mt-3" disabled={!canReturn || pending} onClick={() => { if (window.confirm("Kembalikan pengajuan ini untuk revisi mahasiswa?")) execute(() => returnApplicationAction(applicationId, note), "Pengajuan dikembalikan untuk revisi."); }}><i className="bi bi-arrow-counterclockwise" /> Kembalikan</button>
      </section>

      {msg && <div className={`xl:col-span-2 rounded-xl border p-3 text-sm font-bold ${msg.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>{msg.text}</div>}
    </div>
  );
}
