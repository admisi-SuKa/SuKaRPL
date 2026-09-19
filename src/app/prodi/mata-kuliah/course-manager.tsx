"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteCourseAction, deleteCpmkAction, saveCourseAction, saveCpmkAction } from "../actions";

type Cpmk = { id: string; code: string; sort_order: number; description: string };
type Course = { id: string; code: string; name: string; credits: number; assessment_type: "OBE" | "NON_OBE"; cpmks: Cpmk[] };

export function CourseManager({ courses }: { courses: Course[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [courseForm, setCourseForm] = useState({ id: "", code: "", name: "", credits: 3, assessmentType: "OBE" as "OBE" | "NON_OBE" });
  const [cpmkForm, setCpmkForm] = useState({ id: "", courseId: "", code: "", sortOrder: 1, description: "" });

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, success: string, after?: () => void) {
    setMessage(null);
    startTransition(async () => {
      const result = await fn();
      setMessage(result.ok ? { ok: true, text: success } : { ok: false, text: result.error || "Gagal memproses." });
      if (result.ok) { after?.(); router.refresh(); }
    });
  }

  return (
    <div className="space-y-5">
      {message && <div className={`rounded-xl border p-3 text-sm font-bold ${message.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>{message.text}</div>}

      <section className="rpl-card p-5">
        <div><h1 className="text-xl sm:text-2xl font-black text-[var(--rpl-green-950)]">Master Mata Kuliah & CPMK</h1><p className="mt-1 text-sm text-[var(--muted)]">Atur mode penilaian OBE/Non OBE dan CPMK tiap mata kuliah.</p></div>
        <div className="mt-5 grid gap-3 lg:grid-cols-[140px_1fr_110px_150px_auto] lg:items-end">
          <div><label className="rpl-label">Kode MK</label><input className="rpl-input" value={courseForm.code} onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value })} placeholder="RPL601" /></div>
          <div><label className="rpl-label">Nama Mata Kuliah</label><input className="rpl-input" value={courseForm.name} onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })} /></div>
          <div><label className="rpl-label">SKS</label><input className="rpl-input" type="number" step="0.5" min="0.5" value={courseForm.credits} onChange={(e) => setCourseForm({ ...courseForm, credits: Number(e.target.value) })} /></div>
          <div><label className="rpl-label">Penilaian</label><select className="rpl-select" value={courseForm.assessmentType} onChange={(e) => setCourseForm({ ...courseForm, assessmentType: e.target.value as any })}><option value="OBE">OBE per CPMK</option><option value="NON_OBE">Non OBE</option></select></div>
          <div className="flex gap-2"><button className="rpl-btn rpl-btn-primary flex-1" disabled={pending} type="button" onClick={() => run(() => saveCourseAction(courseForm), courseForm.id ? "Mata kuliah diperbarui." : "Mata kuliah ditambahkan.", () => setCourseForm({ id: "", code: "", name: "", credits: 3, assessmentType: "OBE" }))}><i className="bi bi-check2" /> Simpan</button>{courseForm.id && <button className="rpl-btn rpl-btn-secondary" type="button" onClick={() => setCourseForm({ id: "", code: "", name: "", credits: 3, assessmentType: "OBE" })}><i className="bi bi-x" /></button>}</div>
        </div>
      </section>

      <div className="space-y-4">
        {courses.map((course) => (
          <section key={course.id} className="rpl-card overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-[var(--line)] bg-[#fbfdfc] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-black text-[var(--rpl-green-800)]">{course.code}</span><span className="rpl-pill bg-white text-[#60736e]">{course.credits} SKS</span><span className={`rpl-pill ${course.assessment_type === "OBE" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{course.assessment_type}</span></div><h2 className="mt-1 text-lg font-black">{course.name}</h2></div>
              <div className="flex gap-2"><button className="rpl-btn rpl-btn-secondary text-xs" type="button" onClick={() => setCourseForm({ id: course.id, code: course.code, name: course.name, credits: course.credits, assessmentType: course.assessment_type })}><i className="bi bi-pencil" /> Edit MK</button><button className="rpl-btn rpl-btn-danger text-xs" type="button" onClick={() => { if (window.confirm(`Nonaktifkan ${course.code}?`)) run(() => deleteCourseAction(course.id), "Mata kuliah dinonaktifkan."); }}><i className="bi bi-trash" /></button></div>
            </div>

            <div className="p-4">
              {course.assessment_type === "NON_OBE" ? <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900"><i className="bi bi-info-circle mr-2" />Mode Non OBE dinilai langsung pada mata kuliah, sehingga CPMK tidak dipakai dalam form asesmen.</div> : (
                <>
                  <div className="mb-3 flex items-center justify-between"><h3 className="font-black text-[var(--rpl-green-950)]">CPMK Aktif</h3><button className="rpl-btn rpl-btn-secondary text-xs" type="button" onClick={() => setCpmkForm({ id: "", courseId: course.id, code: `CPMK-${course.cpmks.length + 1}`, sortOrder: course.cpmks.length + 1, description: "" })}><i className="bi bi-plus-lg" /> Tambah CPMK</button></div>
                  <div className="space-y-2">{course.cpmks.map((cp) => <div key={cp.id} className="flex flex-col gap-2 rounded-xl border border-[var(--line)] p-3 sm:flex-row sm:items-start"><div className="min-w-[92px] text-xs font-black text-[var(--rpl-green-800)]">{cp.code}</div><div className="flex-1 text-sm leading-6">{cp.description}</div><div className="flex gap-1"><button className="p-2 rounded-lg hover:bg-slate-100" onClick={() => setCpmkForm({ id: cp.id, courseId: course.id, code: cp.code, sortOrder: cp.sort_order, description: cp.description })}><i className="bi bi-pencil" /></button><button className="p-2 rounded-lg text-red-600 hover:bg-red-50" onClick={() => { if (window.confirm("Nonaktifkan CPMK ini?")) run(() => deleteCpmkAction(cp.id), "CPMK dinonaktifkan."); }}><i className="bi bi-trash" /></button></div></div>)}</div>
                  {!course.cpmks.length && <div className="rounded-xl border border-dashed border-[var(--line)] p-4 text-sm text-[var(--muted)]">Belum ada CPMK. Mata kuliah OBE memerlukan minimal satu CPMK sebelum yudisium dapat difinalisasi.</div>}
                </>
              )}
            </div>
          </section>
        ))}
      </div>

      {cpmkForm.courseId && <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setCpmkForm({ id: "", courseId: "", code: "", sortOrder: 1, description: "" }); }}><div className="rpl-card w-full max-w-xl p-5"><div className="flex justify-between"><div><h2 className="text-lg font-black">{cpmkForm.id ? "Edit CPMK" : "Tambah CPMK"}</h2><p className="text-xs text-[var(--muted)] mt-1">CPMK digunakan sebagai unit penilaian pada mode OBE.</p></div><button onClick={() => setCpmkForm({ id: "", courseId: "", code: "", sortOrder: 1, description: "" })}><i className="bi bi-x-lg" /></button></div><div className="mt-4 grid gap-3 sm:grid-cols-[140px_110px_1fr]"><div><label className="rpl-label">Kode</label><input className="rpl-input" value={cpmkForm.code} onChange={(e) => setCpmkForm({ ...cpmkForm, code: e.target.value })} /></div><div><label className="rpl-label">Urutan</label><input type="number" min="1" className="rpl-input" value={cpmkForm.sortOrder} onChange={(e) => setCpmkForm({ ...cpmkForm, sortOrder: Number(e.target.value) })} /></div><div className="sm:col-span-3"><label className="rpl-label">Deskripsi CPMK</label><textarea className="rpl-textarea" value={cpmkForm.description} onChange={(e) => setCpmkForm({ ...cpmkForm, description: e.target.value })} /></div></div><div className="mt-4 flex justify-end gap-2"><button className="rpl-btn rpl-btn-secondary" onClick={() => setCpmkForm({ id: "", courseId: "", code: "", sortOrder: 1, description: "" })}>Batal</button><button className="rpl-btn rpl-btn-primary" disabled={pending} onClick={() => run(() => saveCpmkAction(cpmkForm), cpmkForm.id ? "CPMK diperbarui." : "CPMK ditambahkan.", () => setCpmkForm({ id: "", courseId: "", code: "", sortOrder: 1, description: "" }))}><i className="bi bi-check2" /> Simpan</button></div></div></div>}
    </div>
  );
}
