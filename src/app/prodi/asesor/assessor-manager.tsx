"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createAssessorAction, saveAssignmentAction, setAssessorActiveAction, updateAssessorAction } from "../actions";

type Assessor = { id: string; full_name: string; nip: string; email: string | null; active: boolean };
type AppRow = { id: string; status: string; participant: { full_name: string; participant_no: string } | null; assignment?: { assessor1_id: string; assessor2_id: string } | null; paymentStatus?: string | null };

type EditForm = { id: string; fullName: string; nip: string; email: string; newPassword: string };

export function AssessorManager({ assessors, applications }: { assessors: Assessor[]; applications: AppRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [form, setForm] = useState({ fullName: "", nip: "", email: "", temporaryPassword: "" });
  const [edit, setEdit] = useState<EditForm | null>(null);
  const [assignmentDraft, setAssignmentDraft] = useState<Record<string, { a1: string; a2: string }>>(() => Object.fromEntries(applications.map((a) => [a.id, { a1: a.assignment?.assessor1_id || "", a2: a.assignment?.assessor2_id || "" }])));

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, success: string, after?: () => void) {
    setMsg(null);
    startTransition(async () => {
      const result = await fn();
      setMsg(result.ok ? { ok: true, text: success } : { ok: false, text: result.error || "Gagal memproses." });
      if (result.ok) { after?.(); router.refresh(); }
    });
  }

  return (
    <div className="space-y-5">
      <section className="rpl-card p-5">
        <h1 className="text-xl sm:text-2xl font-black text-[var(--rpl-green-950)]">Asesor & Plotting</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Buat akun asesor individual, edit identitas/password, dan tetapkan dua asesor untuk setiap peserta.</p>
        {msg && <div className={`mt-4 rounded-xl border p-3 text-sm font-bold ${msg.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>{msg.text}</div>}
        <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_170px_1fr_180px_auto] lg:items-end">
          <div><label className="rpl-label">Nama Lengkap</label><input className="rpl-input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></div>
          <div><label className="rpl-label">NIP</label><input className="rpl-input" value={form.nip} onChange={(e) => setForm({ ...form, nip: e.target.value })} /></div>
          <div><label className="rpl-label">Email</label><input type="email" className="rpl-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><label className="rpl-label">Password Sementara</label><input type="password" className="rpl-input" value={form.temporaryPassword} onChange={(e) => setForm({ ...form, temporaryPassword: e.target.value })} /></div>
          <button type="button" className="rpl-btn rpl-btn-primary" disabled={pending} onClick={() => run(() => createAssessorAction(form), "Akun asesor berhasil dibuat.", () => setForm({ fullName: "", nip: "", email: "", temporaryPassword: "" }))}><i className="bi bi-person-plus" /> Tambah</button>
        </div>
      </section>

      {edit && <section className="rpl-card border-2 border-[var(--rpl-green-100)] p-5">
        <div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-black text-[var(--rpl-green-950)]">Edit Asesor</h2><p className="mt-1 text-xs text-[var(--muted)]">Kosongkan password jika tidak ingin mengubahnya. Password baru minimal 10 karakter.</p></div><button type="button" className="rpl-btn rpl-btn-secondary text-xs" onClick={() => setEdit(null)}><i className="bi bi-x-lg" /> Tutup</button></div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
          <div><label className="rpl-label">Nama Lengkap</label><input className="rpl-input" value={edit.fullName} onChange={(e) => setEdit({ ...edit, fullName: e.target.value })} /></div>
          <div><label className="rpl-label">NIP</label><input className="rpl-input" value={edit.nip} onChange={(e) => setEdit({ ...edit, nip: e.target.value })} /></div>
          <div><label className="rpl-label">Email Internal</label><input type="email" className="rpl-input" value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /></div>
          <div><label className="rpl-label">Password Baru</label><input type="password" className="rpl-input" placeholder="Kosongkan jika tetap" value={edit.newPassword} onChange={(e) => setEdit({ ...edit, newPassword: e.target.value })} /></div>
        </div>
        <div className="mt-4 flex justify-end"><button type="button" className="rpl-btn rpl-btn-primary" disabled={pending} onClick={() => run(() => updateAssessorAction(edit), "Data asesor berhasil diperbarui.", () => setEdit(null))}><i className="bi bi-floppy" /> Simpan Perubahan</button></div>
      </section>}

      <section className="rpl-card p-5">
        <h2 className="text-lg font-black text-[var(--rpl-green-950)]">Daftar Asesor</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {assessors.map((a) => <div key={a.id} className="rounded-xl border border-[var(--line)] p-4"><div className="flex items-start gap-3"><div className="grid h-10 w-10 place-items-center rounded-full bg-[var(--rpl-green-50)] text-[var(--rpl-green-800)]"><i className="bi bi-person-badge" /></div><div className="min-w-0 flex-1"><div className="font-black">{a.full_name}</div><div className="text-xs text-[var(--muted)]">NIP {a.nip}</div><div className="mt-1 truncate text-xs text-[var(--muted)]">{a.email}</div></div><span className={`rpl-pill ${a.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{a.active ? "Aktif" : "Nonaktif"}</span></div><div className="mt-3 flex flex-wrap gap-2"><button type="button" className="rpl-btn rpl-btn-secondary text-xs" onClick={() => setEdit({ id: a.id, fullName: a.full_name, nip: a.nip, email: a.email || "", newPassword: "" })}><i className="bi bi-pencil-square" /> Edit / Password</button><button type="button" className="rpl-btn rpl-btn-secondary text-xs" onClick={() => run(() => setAssessorActiveAction(a.id, !a.active), a.active ? "Asesor dinonaktifkan." : "Asesor diaktifkan.")}><i className={`bi ${a.active ? "bi-person-dash" : "bi-person-check"}`} /> {a.active ? "Nonaktifkan" : "Aktifkan"}</button></div></div>)}
          {!assessors.length && <div className="text-sm text-[var(--muted)]">Belum ada asesor.</div>}
        </div>
      </section>

      <section className="rpl-card p-5">
        <h2 className="text-lg font-black text-[var(--rpl-green-950)]">Plotting Peserta</h2>
        <p className="mt-1 text-xs text-[var(--muted)]">Pengajuan baru hanya dapat diplot setelah bukti pembayaran berstatus Terverifikasi.</p>
        <div className="mt-4 space-y-3">
          {applications.map((app) => {
            const draft = assignmentDraft[app.id] || { a1: "", a2: "" };
            return <div key={app.id} className="rounded-xl border border-[var(--line)] p-4"><div className="flex flex-col gap-4 xl:flex-row xl:items-end"><div className="xl:w-72"><div className="text-xs font-black text-[var(--rpl-green-800)]">{app.participant?.participant_no}</div><div className="font-black">{app.participant?.full_name}</div><div className="text-[11px] text-[var(--muted)]">Status {app.status}</div><div className={`mt-1 text-[11px] font-bold ${app.paymentStatus === "VERIFIED" ? "text-emerald-700" : app.assignment ? "text-slate-600" : "text-amber-700"}`}>Pembayaran: {app.paymentStatus === "VERIFIED" ? "Terverifikasi" : app.paymentStatus === "SUBMITTED" ? "Menunggu verifikasi" : app.paymentStatus === "REJECTED" ? "Ditolak" : app.assignment ? "Data lama" : "Belum terverifikasi"}</div></div><div className="grid flex-1 gap-3 sm:grid-cols-2"><div><label className="rpl-label">Asesor 1</label><select className="rpl-select" value={draft.a1} onChange={(e) => setAssignmentDraft({ ...assignmentDraft, [app.id]: { ...draft, a1: e.target.value } })}><option value="">Pilih asesor</option>{assessors.filter((a) => a.active).map((a) => <option key={a.id} value={a.id}>{a.full_name} — {a.nip}</option>)}</select></div><div><label className="rpl-label">Asesor 2</label><select className="rpl-select" value={draft.a2} onChange={(e) => setAssignmentDraft({ ...assignmentDraft, [app.id]: { ...draft, a2: e.target.value } })}><option value="">Pilih asesor</option>{assessors.filter((a) => a.active).map((a) => <option key={a.id} value={a.id}>{a.full_name} — {a.nip}</option>)}</select></div></div><button type="button" className="rpl-btn rpl-btn-primary" disabled={pending || (!app.assignment && app.paymentStatus !== "VERIFIED")} title={!app.assignment && app.paymentStatus !== "VERIFIED" ? "Pembayaran harus terverifikasi terlebih dahulu" : undefined} onClick={() => run(() => saveAssignmentAction(app.id, draft.a1, draft.a2), "Plotting berhasil disimpan.")}><i className="bi bi-check2-circle" /> Simpan</button></div></div>;
          })}
          {!applications.length && <div className="rounded-xl border border-dashed border-[var(--line)] p-5 text-sm text-[var(--muted)]">Belum ada pengajuan yang siap diplot.</div>}
        </div>
      </section>
    </div>
  );
}
