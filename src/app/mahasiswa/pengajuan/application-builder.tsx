"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import { deleteEvidenceAction, saveEvidenceAction, submitApplicationAction, toggleCourseClaimAction, toggleCpmkClaimAction } from "../actions";

type Course = { id: string; code: string; name: string; credits: number; assessment_type: "OBE" | "NON_OBE" };
type Claim = { id: string; course_id: string };
type Cpmk = { id: string; course_id: string; code: string; description: string; sort_order: number };
type ClaimCpmk = { course_claim_id: string; cpmk_id: string };
type EvidenceType = { id: string; title: string };
type Evidence = { id: string; evidence_type_id: string; title: string; url: string; description: string | null; claim_ids: string[] };

type Props = {
  status: string;
  returnNote?: string | null;
  courses: Course[];
  claims: Claim[];
  cpmks: Cpmk[];
  claimCpmks: ClaimCpmk[];
  evidenceTypes: EvidenceType[];
  evidences: Evidence[];
};

const emptyForm = { id: "", evidenceTypeId: "", title: "", url: "", description: "", claimIds: [] as string[] };

export function ApplicationBuilder({ status, returnNote, courses, claims, cpmks, claimCpmks, evidenceTypes, evidences }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const editable = status === "DRAFT" || status === "RETURNED";
  const claimByCourse = useMemo(() => new Map(claims.map((c) => [c.course_id, c])), [claims]);
  const selectedClaims = claims.map((claim) => ({ ...claim, course: courses.find((c) => c.id === claim.course_id)! })).filter((x) => x.course);

  function run(task: () => Promise<{ ok: boolean; error?: string }>, success?: string) {
    setMessage(null);
    startTransition(async () => {
      const result = await task();
      if (!result.ok) setMessage({ type: "error", text: result.error || "Terjadi kesalahan." });
      else {
        if (success) setMessage({ type: "ok", text: success });
        router.refresh();
      }
    });
  }

  function editEvidence(evidence: Evidence) {
    setForm({
      id: evidence.id,
      evidenceTypeId: evidence.evidence_type_id,
      title: evidence.title,
      url: evidence.url,
      description: evidence.description || "",
      claimIds: evidence.claim_ids
    });
    setFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setForm(emptyForm);
    setFormOpen(false);
  }

  function toggleClaimInEvidence(claimId: string) {
    setForm((old) => ({ ...old, claimIds: old.claimIds.includes(claimId) ? old.claimIds.filter((id) => id !== claimId) : [...old.claimIds, claimId] }));
  }

  return (
    <div className="space-y-5">
      <section className="rpl-card p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2"><h1 className="text-xl sm:text-2xl font-black text-[var(--rpl-green-950)]">Pengajuan RPL</h1><StatusBadge status={status} /></div>
            <p className="mt-1 text-sm text-[var(--muted)]">Pilih mata kuliah, centang CPMK yang diajukan untuk MK OBE, lalu hubungkan bukti berupa link.</p>
          </div>
          {editable && (
            <button className="rpl-btn rpl-btn-primary" type="button" disabled={pending || !claims.length} onClick={() => {
              if (window.confirm("Setelah dikirim, pengajuan akan dikunci sampai Prodi mengembalikannya untuk revisi. Kirim sekarang?")) {
                run(() => submitApplicationAction(), "Pengajuan berhasil dikirim.");
              }
            }}><i className="bi bi-send-check" /> Kirim Pengajuan</button>
          )}
        </div>
        {status === "RETURNED" && returnNote && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><strong>Catatan Prodi:</strong> {returnNote}</div>}
        {!editable && <div className="mt-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-800"><i className="bi bi-lock-fill mr-2" />Pengajuan sudah dikunci. Anda masih dapat melihat seluruh data dan bukti.</div>}
        {message && <div className={`mt-4 rounded-xl border p-3 text-sm font-bold ${message.type === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>{message.text}</div>}
      </section>

      {editable && formOpen && (
        <section className="rpl-card p-4 sm:p-5 border-t-4 border-t-[var(--rpl-orange)]">
          <div className="flex items-center justify-between gap-3">
            <div><h2 className="font-black text-[var(--rpl-green-950)]">{form.id ? "Edit Bukti" : "Tambah Bukti"}</h2><p className="text-xs text-[var(--muted)] mt-1">Satu bukti dapat dihubungkan ke beberapa mata kuliah.</p></div>
            <button type="button" className="p-2 rounded-lg hover:bg-slate-100" onClick={resetForm} aria-label="Tutup"><i className="bi bi-x-lg" /></button>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div>
              <label className="rpl-label">Jenis Bukti</label>
              <select className="rpl-select" value={form.evidenceTypeId} onChange={(e) => setForm({ ...form, evidenceTypeId: e.target.value })}>
                <option value="">Pilih jenis bukti</option>
                {evidenceTypes.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </div>
            <div>
              <label className="rpl-label">Judul Bukti</label>
              <input className="rpl-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Contoh: Sertifikat Pelatihan Data Analytics" />
            </div>
            <div className="lg:col-span-2">
              <label className="rpl-label">Link Bukti</label>
              <div className="relative"><i className="bi bi-link-45deg absolute left-3 top-1/2 -translate-y-1/2 text-[#7b8e89]" /><input className="rpl-input pl-10" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://drive.google.com/..." /></div>
              <p className="mt-1.5 text-[11px] text-[var(--muted)]">Pastikan link dapat diakses asesor sesuai kebijakan institusi.</p>
            </div>
            <div className="lg:col-span-2">
              <label className="rpl-label">Keterangan</label>
              <textarea className="rpl-textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Jelaskan singkat isi dan relevansi bukti." />
            </div>
            <div className="lg:col-span-2">
              <label className="rpl-label">Digunakan untuk Mata Kuliah</label>
              {!selectedClaims.length ? <div className="rounded-xl border border-dashed border-[var(--line)] p-4 text-sm text-[var(--muted)]">Pilih mata kuliah terlebih dahulu.</div> : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {selectedClaims.map(({ id, course }) => (
                    <label key={id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${form.claimIds.includes(id) ? "border-emerald-300 bg-emerald-50" : "border-[var(--line)]"}`}>
                      <input className="mt-1 h-4 w-4 accent-[var(--rpl-green-800)]" type="checkbox" checked={form.claimIds.includes(id)} onChange={() => toggleClaimInEvidence(id)} />
                      <span><span className="block text-xs font-black text-[var(--rpl-green-900)]">{course.code}</span><span className="block text-sm font-bold">{course.name}</span></span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button className="rpl-btn rpl-btn-secondary" type="button" onClick={resetForm}>Batal</button>
            <button className="rpl-btn rpl-btn-primary" disabled={pending} type="button" onClick={() => run(
              () => saveEvidenceAction(form),
              form.id ? "Bukti berhasil diperbarui." : "Bukti berhasil ditambahkan."
            )}><i className="bi bi-check2-circle" /> Simpan Bukti</button>
          </div>
        </section>
      )}

      <section className="rpl-card p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div><h2 className="text-lg font-black text-[var(--rpl-green-950)]">1. Pilih Mata Kuliah & CPMK</h2><p className="mt-1 text-xs text-[var(--muted)]">{claims.length} mata kuliah dipilih. Untuk MK OBE, centang CPMK yang ingin direkognisi.</p></div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => {
            const claim = claimByCourse.get(course.id);
            const courseCpmks = cpmks.filter((cp) => cp.course_id === course.id);
            const selectedCpmkIds = new Set(claim ? claimCpmks.filter((x) => x.course_claim_id === claim.id).map((x) => x.cpmk_id) : []);
            return (
              <div key={course.id} className={`rounded-2xl border p-4 transition ${claim ? "border-emerald-300 bg-emerald-50/70" : "border-[var(--line)] bg-white"}`}>
                <label className={`flex gap-3 ${editable ? "cursor-pointer" : ""}`}>
                  <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-[var(--rpl-green-800)]" disabled={!editable || pending} checked={Boolean(claim)} onChange={(e) => run(() => toggleCourseClaimAction(course.id, e.target.checked))} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2"><span className="text-xs font-black text-[var(--rpl-green-800)]">{course.code}</span><span className="rpl-pill bg-white text-[#687c76]">{course.credits} SKS</span></div>
                    <div className="mt-1 text-sm font-black leading-5">{course.name}</div>
                    <div className="mt-2 text-[10px] font-bold text-[var(--muted)]">Penilaian {course.assessment_type === "OBE" ? "OBE per CPMK" : "Non OBE"}</div>
                  </div>
                </label>
                {claim && course.assessment_type === "OBE" && (
                  <div className="mt-4 border-t border-emerald-200 pt-3">
                    <div className="mb-2 text-[11px] font-black uppercase tracking-wide text-[var(--rpl-green-900)]">Checklist CPMK</div>
                    <div className="space-y-2">
                      {courseCpmks.map((cp) => (
                        <label key={cp.id} className={`flex items-start gap-2 rounded-xl border p-2.5 ${selectedCpmkIds.has(cp.id) ? "border-emerald-300 bg-white" : "border-emerald-100 bg-emerald-50/30"} ${editable ? "cursor-pointer" : ""}`}>
                          <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--rpl-green-800)]" disabled={!editable || pending} checked={selectedCpmkIds.has(cp.id)} onChange={(e) => run(() => toggleCpmkClaimAction(claim.id, cp.id, e.target.checked))} />
                          <span className="text-xs leading-5"><strong className="text-[var(--rpl-green-900)]">{cp.code}</strong> — {cp.description}</span>
                        </label>
                      ))}
                      {!courseCpmks.length && <div className="rounded-xl bg-amber-50 p-2.5 text-xs text-amber-900">CPMK belum tersedia. Hubungi Program Studi.</div>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="rpl-card p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="text-lg font-black text-[var(--rpl-green-950)]">2. Bukti RPL</h2><p className="mt-1 text-xs text-[var(--muted)]">Bukti disimpan sebagai link, bukan file upload.</p></div>
          {editable && <button className="rpl-btn rpl-btn-orange" type="button" disabled={!claims.length} onClick={() => { setForm(emptyForm); setFormOpen(true); }}><i className="bi bi-plus-lg" /> Tambah Bukti</button>}
        </div>

        {!evidences.length ? (
          <div className="mt-4 rounded-2xl border border-dashed border-[var(--line)] p-8 text-center text-sm text-[var(--muted)]"><i className="bi bi-link-45deg block text-3xl mb-2 text-[#9aaca7]" />Belum ada bukti.</div>
        ) : (
          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            {evidences.map((evidence) => {
              const type = evidenceTypes.find((t) => t.id === evidence.evidence_type_id)?.title || evidence.evidence_type_id;
              const linked = selectedClaims.filter((claim) => evidence.claim_ids.includes(claim.id));
              return (
                <article key={evidence.id} className="rounded-2xl border border-[var(--line)] p-4 bg-[#fbfdfc]">
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--rpl-green-100)] text-[var(--rpl-green-900)]"><i className="bi bi-link-45deg text-xl" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-black uppercase tracking-wide text-[var(--rpl-orange)]">{type}</div>
                      <h3 className="mt-1 font-black leading-5">{evidence.title}</h3>
                      {evidence.description && <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{evidence.description}</p>}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">{linked.map((x) => <span key={x.id} className="rpl-pill bg-emerald-50 text-emerald-800">{x.course.code}</span>)}</div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <a href={evidence.url} target="_blank" rel="noopener noreferrer" className="rpl-btn rpl-btn-secondary text-xs"><i className="bi bi-box-arrow-up-right" /> Buka Bukti</a>
                    {editable && <button type="button" className="rpl-btn rpl-btn-secondary text-xs" onClick={() => editEvidence(evidence)}><i className="bi bi-pencil" /> Edit</button>}
                    {editable && <button type="button" className="rpl-btn rpl-btn-danger text-xs" onClick={() => { if (window.confirm("Hapus bukti ini?")) run(() => deleteEvidenceAction(evidence.id)); }}><i className="bi bi-trash" /> Hapus</button>}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
