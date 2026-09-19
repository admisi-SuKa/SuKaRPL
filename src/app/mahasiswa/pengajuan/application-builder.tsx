"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import { saveRplDraftAction, submitRplDraftAction, type RplBatchDraftInput } from "../actions";

type Course = { id: string; code: string; name: string; credits: number; assessment_type: "OBE" | "NON_OBE" };
type Claim = { id: string; course_id: string };
type Cpmk = { id: string; course_id: string; code: string; description: string; sort_order: number };
type ClaimCpmk = { course_claim_id: string; cpmk_id: string };
type SupportingEvidence = { id: string; course_claim_id: string; cpmk_id: string | null; url: string; description: string | null };

type EvidenceDraft = { clientId: string; url: string; description: string };
type CpmkDraft = { selected: boolean; evidences: EvidenceDraft[] };
type CourseDraft = { selected: boolean; cpmks: Record<string, CpmkDraft>; evidences: EvidenceDraft[] };

type Props = {
  status: string;
  returnNote?: string | null;
  courses: Course[];
  claims: Claim[];
  cpmks: Cpmk[];
  claimCpmks: ClaimCpmk[];
  supportingEvidences: SupportingEvidence[];
};

function newClientId() {
  return `new-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function blankEvidence(clientId = newClientId()): EvidenceDraft {
  return { clientId, url: "", description: "" };
}

function validHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function ApplicationBuilder({ status, returnNote, courses, claims, cpmks, claimCpmks, supportingEvidences }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const editable = status === "DRAFT" || status === "RETURNED";

  const claimByCourse = useMemo(() => new Map(claims.map((claim) => [claim.course_id, claim])), [claims]);
  const cpmksByCourse = useMemo(() => {
    const map = new Map<string, Cpmk[]>();
    for (const cp of cpmks) {
      const rows = map.get(cp.course_id) || [];
      rows.push(cp);
      map.set(cp.course_id, rows);
    }
    for (const rows of map.values()) rows.sort((a, b) => a.sort_order - b.sort_order);
    return map;
  }, [cpmks]);

  const [draft, setDraft] = useState<Record<string, CourseDraft>>(() => {
    const result: Record<string, CourseDraft> = {};
    for (const course of courses) {
      const claim = claimByCourse.get(course.id);
      const selectedCpmkIds = new Set(
        claim ? claimCpmks.filter((row) => row.course_claim_id === claim.id).map((row) => row.cpmk_id) : []
      );
      const cpmkDrafts: Record<string, CpmkDraft> = {};
      for (const cp of cpmks.filter((row) => row.course_id === course.id)) {
        const selected = Boolean(claim && selectedCpmkIds.has(cp.id));
        const evidenceRows = claim
          ? supportingEvidences
              .filter((e) => e.course_claim_id === claim.id && e.cpmk_id === cp.id)
              .map((e) => ({ clientId: e.id, url: e.url, description: e.description || "" }))
          : [];
        cpmkDrafts[cp.id] = {
          selected,
          evidences: selected && !evidenceRows.length ? [blankEvidence(`blank-${course.id}-${cp.id}`)] : evidenceRows
        };
      }
      const courseEvidenceRows = claim
        ? supportingEvidences
            .filter((e) => e.course_claim_id === claim.id && e.cpmk_id === null)
            .map((e) => ({ clientId: e.id, url: e.url, description: e.description || "" }))
        : [];
      result[course.id] = {
        selected: Boolean(claim),
        cpmks: cpmkDrafts,
        evidences:
          course.assessment_type === "NON_OBE" && claim && !courseEvidenceRows.length
            ? [blankEvidence(`blank-${course.id}-course`)]
            : courseEvidenceRows
      };
    }
    return result;
  });

  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  function mutateCourse(courseId: string, updater: (old: CourseDraft) => CourseDraft) {
    setDraft((old) => ({ ...old, [courseId]: updater(old[courseId]) }));
    setDirty(true);
    setMessage(null);
  }

  function toggleCourse(course: Course, selected: boolean) {
    mutateCourse(course.id, (old) => {
      if (!selected) return { ...old, selected: false };
      if (course.assessment_type === "NON_OBE" && !old.evidences.length) {
        return { ...old, selected: true, evidences: [blankEvidence()] };
      }
      return { ...old, selected: true };
    });
  }

  function toggleCpmk(courseId: string, cpmkId: string, selected: boolean) {
    mutateCourse(courseId, (old) => {
      const current = old.cpmks[cpmkId] || { selected: false, evidences: [] };
      return {
        ...old,
        cpmks: {
          ...old.cpmks,
          [cpmkId]: {
            ...current,
            selected,
            evidences: selected && !current.evidences.length ? [blankEvidence()] : current.evidences
          }
        }
      };
    });
  }

  function updateEvidence(courseId: string, cpmkId: string | null, clientId: string, patch: Partial<EvidenceDraft>) {
    mutateCourse(courseId, (old) => {
      if (cpmkId) {
        const cp = old.cpmks[cpmkId];
        return {
          ...old,
          cpmks: {
            ...old.cpmks,
            [cpmkId]: { ...cp, evidences: cp.evidences.map((row) => (row.clientId === clientId ? { ...row, ...patch } : row)) }
          }
        };
      }
      return { ...old, evidences: old.evidences.map((row) => (row.clientId === clientId ? { ...row, ...patch } : row)) };
    });
  }

  function addEvidence(courseId: string, cpmkId: string | null) {
    mutateCourse(courseId, (old) => {
      if (cpmkId) {
        const cp = old.cpmks[cpmkId];
        return { ...old, cpmks: { ...old.cpmks, [cpmkId]: { ...cp, evidences: [...cp.evidences, blankEvidence()] } } };
      }
      return { ...old, evidences: [...old.evidences, blankEvidence()] };
    });
  }

  function removeEvidence(courseId: string, cpmkId: string | null, clientId: string) {
    mutateCourse(courseId, (old) => {
      if (cpmkId) {
        const cp = old.cpmks[cpmkId];
        return { ...old, cpmks: { ...old.cpmks, [cpmkId]: { ...cp, evidences: cp.evidences.filter((row) => row.clientId !== clientId) } } };
      }
      return { ...old, evidences: old.evidences.filter((row) => row.clientId !== clientId) };
    });
  }

  function normalizeEvidenceRows(rows: EvidenceDraft[], label: string) {
    const result: Array<{ url: string; description: string }> = [];
    for (const row of rows) {
      const url = row.url.trim();
      const description = row.description.trim();
      if (!url && !description) continue;
      if (!url) throw new Error(`${label}: link bukti dukung belum diisi.`);
      if (!validHttpUrl(url)) throw new Error(`${label}: link bukti dukung harus berupa URL http/https yang valid.`);
      if (description.length > 1500) throw new Error(`${label}: deskripsi maksimal 1500 karakter.`);
      result.push({ url, description });
    }
    return result;
  }

  function buildPayload(forSubmit: boolean): RplBatchDraftInput {
    const selectedCourses = courses.filter((course) => draft[course.id]?.selected);
    if (forSubmit && !selectedCourses.length) throw new Error("Pilih minimal satu mata kuliah.");

    return {
      courses: selectedCourses.map((course) => {
        const row = draft[course.id];
        if (course.assessment_type === "OBE") {
          const selectedCpmks = (cpmksByCourse.get(course.id) || []).filter((cp) => row.cpmks[cp.id]?.selected);
          if (forSubmit && !selectedCpmks.length) throw new Error(`${course.code}: pilih minimal satu CPMK.`);
          return {
            courseId: course.id,
            evidences: [],
            cpmks: selectedCpmks.map((cp) => {
              const evidences = normalizeEvidenceRows(row.cpmks[cp.id]?.evidences || [], `${course.code} / ${cp.code}`);
              if (forSubmit && !evidences.length) throw new Error(`${course.code} / ${cp.code}: minimal satu bukti dukung wajib diisi.`);
              return { cpmkId: cp.id, evidences };
            })
          };
        }
        const evidences = normalizeEvidenceRows(row.evidences || [], course.code);
        if (forSubmit && !evidences.length) throw new Error(`${course.code}: minimal satu bukti dukung wajib diisi.`);
        return { courseId: course.id, cpmks: [], evidences };
      })
    };
  }

  function saveDraft() {
    setMessage(null);
    let payload: RplBatchDraftInput;
    try {
      payload = buildPayload(false);
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Data draft belum valid." });
      return;
    }
    startTransition(async () => {
      const result = await saveRplDraftAction(payload);
      if (!result.ok) {
        setMessage({ type: "error", text: result.error || "Gagal menyimpan draft." });
        return;
      }
      setDirty(false);
      setMessage({ type: "ok", text: "Draft berhasil disimpan. Checklist dan bukti dukung sudah tersimpan ke database." });
    });
  }

  function submitDraft() {
    setMessage(null);
    let payload: RplBatchDraftInput;
    try {
      payload = buildPayload(true);
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Pengajuan belum lengkap." });
      return;
    }
    if (!window.confirm("Kirim pengajuan RPL? Setelah dikirim, data akan dikunci sampai Prodi mengembalikannya untuk revisi.")) return;
    startTransition(async () => {
      const result = await submitRplDraftAction(payload);
      if (!result.ok) {
        setMessage({ type: "error", text: result.error || "Gagal mengirim pengajuan." });
        return;
      }
      setDirty(false);
      setMessage({ type: "ok", text: "Pengajuan RPL berhasil dikirim." });
      router.refresh();
    });
  }

  const selectedCourseCount = courses.filter((course) => draft[course.id]?.selected).length;
  const selectedCpmkCount = courses.reduce((count, course) => {
    if (!draft[course.id]?.selected || course.assessment_type !== "OBE") return count;
    return count + (Object.values(draft[course.id].cpmks) as CpmkDraft[]).filter((cp) => cp.selected).length;
  }, 0);
  const evidenceCount = courses.reduce((count, course) => {
    const row = draft[course.id];
    if (!row?.selected) return count;
    if (course.assessment_type === "NON_OBE") return count + row.evidences.filter((e) => e.url.trim()).length;
    return count + (Object.values(row.cpmks) as CpmkDraft[]).filter((cp) => cp.selected).reduce((n, cp) => n + cp.evidences.filter((e) => e.url.trim()).length, 0);
  }, 0);

  return (
    <div className="space-y-5">
      <section className="rpl-card p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-black text-[var(--rpl-green-950)] sm:text-2xl">Pengajuan RPL</h1>
              <StatusBadge status={status} />
              {dirty && editable && <span className="rpl-pill bg-amber-50 text-amber-800">Belum disimpan</span>}
            </div>
            <p className="mt-1 text-sm text-[var(--muted)]">Pilih mata kuliah dan CPMK dalam tabel. Bukti dukung diisi langsung pada setiap CPMK.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs sm:min-w-[310px]">
            <div className="rounded-xl bg-[#f4f8f6] p-2"><div className="text-lg font-black text-[var(--rpl-green-900)]">{selectedCourseCount}</div><div className="text-[var(--muted)]">MK</div></div>
            <div className="rounded-xl bg-[#f4f8f6] p-2"><div className="text-lg font-black text-[var(--rpl-green-900)]">{selectedCpmkCount}</div><div className="text-[var(--muted)]">CPMK</div></div>
            <div className="rounded-xl bg-[#f4f8f6] p-2"><div className="text-lg font-black text-[var(--rpl-green-900)]">{evidenceCount}</div><div className="text-[var(--muted)]">Bukti</div></div>
          </div>
        </div>

        {editable && (
          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs leading-5 text-blue-800">
            <i className="bi bi-lightning-charge-fill mr-2" />
            <strong>Lebih ringan:</strong> checklist CPMK dan pengetikan bukti sekarang hanya diproses di browser. Database baru diperbarui satu kali saat Anda menekan <strong>Simpan Draft</strong> atau <strong>Kirim Pengajuan</strong>.
          </div>
        )}
        {status === "RETURNED" && returnNote && <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><strong>Catatan Prodi:</strong> {returnNote}</div>}
        {!editable && <div className="mt-3 rounded-xl bg-blue-50 p-3 text-sm text-blue-800"><i className="bi bi-lock-fill mr-2" />Pengajuan sudah dikunci. Data tetap dapat dilihat.</div>}
        {message && <div className={`mt-3 rounded-xl border p-3 text-sm font-bold ${message.type === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>{message.text}</div>}
      </section>

      <section className="rpl-card overflow-hidden">
        <div className="border-b border-[var(--line)] p-4 sm:p-5">
          <h2 className="text-lg font-black text-[var(--rpl-green-950)]">Mata Kuliah, CPMK, dan Bukti Dukung</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">Centang CPMK untuk mengaktifkan kolom Bukti Dukung dan Deskripsi. Gunakan “+ Bukti” bila satu CPMK memiliki lebih dari satu bukti.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] border-collapse text-sm">
            <thead>
              <tr className="bg-[#f3f8f6] text-left text-[11px] uppercase tracking-wide text-[var(--rpl-green-800)]">
                <th className="w-[85px] p-3 text-center">Ajukan MK</th>
                <th className="w-[270px] p-3">Mata Kuliah</th>
                <th className="w-[300px] p-3">CPMK</th>
                <th className="min-w-[290px] p-3">Bukti Dukung</th>
                <th className="min-w-[300px] p-3">Deskripsi</th>
                <th className="w-[125px] p-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {courses.map((course) => {
                const row = draft[course.id];
                const courseCpmks = cpmksByCourse.get(course.id) || [];
                return (
                  <CourseRows
                    key={course.id}
                    course={course}
                    row={row}
                    cpmks={courseCpmks}
                    editable={editable}
                    pending={pending}
                    onToggleCourse={(selected) => toggleCourse(course, selected)}
                    onToggleCpmk={(cpmkId, selected) => toggleCpmk(course.id, cpmkId, selected)}
                    onUpdateEvidence={(cpmkId, clientId, patch) => updateEvidence(course.id, cpmkId, clientId, patch)}
                    onAddEvidence={(cpmkId) => addEvidence(course.id, cpmkId)}
                    onRemoveEvidence={(cpmkId, clientId) => removeEvidence(course.id, cpmkId, clientId)}
                  />
                );
              })}
              {!courses.length && <tr><td colSpan={6} className="p-8 text-center text-sm text-[var(--muted)]">Belum ada mata kuliah aktif untuk program studi ini.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {editable && (
        <div className="sticky bottom-20 z-30 rounded-2xl border border-[var(--line)] bg-white/95 p-3 shadow-xl backdrop-blur lg:bottom-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-[var(--muted)]">{dirty ? "Ada perubahan yang belum disimpan." : "Draft sudah sinkron dengan database."}</div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button type="button" className="rpl-btn rpl-btn-secondary" disabled={pending || !dirty} onClick={saveDraft}><i className="bi bi-floppy" /> {pending ? "Memproses..." : "Simpan Draft"}</button>
              <button type="button" className="rpl-btn rpl-btn-primary" disabled={pending || !selectedCourseCount} onClick={submitDraft}><i className="bi bi-send-check" /> Kirim Pengajuan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CourseRows({
  course,
  row,
  cpmks,
  editable,
  pending,
  onToggleCourse,
  onToggleCpmk,
  onUpdateEvidence,
  onAddEvidence,
  onRemoveEvidence
}: {
  course: Course;
  row: CourseDraft;
  cpmks: Cpmk[];
  editable: boolean;
  pending: boolean;
  onToggleCourse: (selected: boolean) => void;
  onToggleCpmk: (cpmkId: string, selected: boolean) => void;
  onUpdateEvidence: (cpmkId: string | null, clientId: string, patch: Partial<EvidenceDraft>) => void;
  onAddEvidence: (cpmkId: string | null) => void;
  onRemoveEvidence: (cpmkId: string | null, clientId: string) => void;
}) {
  const disabled = !editable || pending;
  const isNonObe = course.assessment_type === "NON_OBE";

  return (
    <>
      <tr className={row.selected ? "bg-emerald-50/30" : "bg-white"}>
        <td className="p-3 text-center align-top">
          <input
            type="checkbox"
            aria-label={`Ajukan ${course.code}`}
            className="h-5 w-5 accent-[var(--rpl-green-800)]"
            disabled={disabled}
            checked={row.selected}
            onChange={(e) => onToggleCourse(e.target.checked)}
          />
        </td>
        <td className="p-3 align-top">
          <div className="font-black text-[var(--rpl-green-900)]">{course.code}</div>
          <div className="mt-1 font-bold leading-5">{course.name}</div>
          <div className="mt-2 flex flex-wrap gap-1.5"><span className="rpl-pill bg-white text-[#60736e]">{course.credits} SKS</span><span className="rpl-pill bg-white text-[#60736e]">{course.assessment_type}</span></div>
        </td>
        <td className="p-3 align-top">
          {isNonObe ? <div className="rounded-lg bg-slate-50 p-2 text-xs font-bold text-[var(--muted)]">Non OBE — bukti dukung pada level mata kuliah.</div> : row.selected ? <div className="text-xs text-[var(--muted)]">Centang CPMK pada baris di bawah.</div> : <div className="text-xs text-[var(--muted)]">Centang mata kuliah untuk menampilkan CPMK.</div>}
        </td>
        {isNonObe ? (
          <EvidenceCells
            enabled={row.selected && editable}
            evidences={row.evidences}
            onUpdate={(clientId, patch) => onUpdateEvidence(null, clientId, patch)}
            onAdd={() => onAddEvidence(null)}
            onRemove={(clientId) => onRemoveEvidence(null, clientId)}
          />
        ) : (
          <><td className="p-3 text-xs text-[var(--muted)]">—</td><td className="p-3 text-xs text-[var(--muted)]">—</td><td className="p-3 text-center text-xs text-[var(--muted)]">—</td></>
        )}
      </tr>

      {!isNonObe && row.selected && cpmks.map((cp) => {
        const cpDraft = row.cpmks[cp.id] || { selected: false, evidences: [] };
        return (
          <tr key={cp.id} className={cpDraft.selected ? "bg-[#fbfefc]" : "bg-white"}>
            <td className="p-3 text-center text-[var(--muted)]"><i className="bi bi-arrow-return-right" /></td>
            <td className="p-3 text-xs text-[var(--muted)]">{course.code}</td>
            <td className="p-3 align-top">
              <label className={`flex items-start gap-3 ${editable ? "cursor-pointer" : ""}`}>
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--rpl-green-800)]"
                  disabled={disabled}
                  checked={cpDraft.selected}
                  onChange={(e) => onToggleCpmk(cp.id, e.target.checked)}
                />
                <span><strong className="text-[var(--rpl-green-900)]">{cp.code}</strong><span className="mt-1 block text-xs leading-5 text-[#475b56]">{cp.description}</span></span>
              </label>
            </td>
            <EvidenceCells
              enabled={cpDraft.selected && editable}
              evidences={cpDraft.evidences}
              onUpdate={(clientId, patch) => onUpdateEvidence(cp.id, clientId, patch)}
              onAdd={() => onAddEvidence(cp.id)}
              onRemove={(clientId) => onRemoveEvidence(cp.id, clientId)}
            />
          </tr>
        );
      })}
      {!isNonObe && row.selected && !cpmks.length && <tr><td></td><td></td><td colSpan={4} className="p-3"><div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">CPMK belum tersedia. Hubungi Program Studi.</div></td></tr>}
    </>
  );
}

function EvidenceCells({
  enabled,
  evidences,
  onUpdate,
  onAdd,
  onRemove
}: {
  enabled: boolean;
  evidences: EvidenceDraft[];
  onUpdate: (clientId: string, patch: Partial<EvidenceDraft>) => void;
  onAdd: () => void;
  onRemove: (clientId: string) => void;
}) {
  const inputDisabled = !enabled;
  return (
    <>
      <td className="p-3 align-top">
        <div className="space-y-2">
          {evidences.map((e) => <div key={e.clientId} className="min-h-[74px]"><input className="rpl-input text-xs" disabled={inputDisabled} value={e.url} onChange={(ev) => onUpdate(e.clientId, { url: ev.target.value })} placeholder="https://drive.google.com/..." /></div>)}
          {!evidences.length && <div className="py-2 text-xs text-[var(--muted)]">{enabled ? "Belum ada bukti." : "Aktif setelah dicentang."}</div>}
        </div>
      </td>
      <td className="p-3 align-top">
        <div className="space-y-2">
          {evidences.map((e) => <div key={e.clientId} className="min-h-[74px]"><textarea className="rpl-textarea min-h-[64px] text-xs" disabled={inputDisabled} value={e.description} onChange={(ev) => onUpdate(e.clientId, { description: ev.target.value })} placeholder="Jelaskan relevansi bukti dengan CPMK..." /></div>)}
          {!evidences.length && <div className="py-2 text-xs text-[var(--muted)]">—</div>}
        </div>
      </td>
      <td className="p-3 align-top text-center">
        <div className="space-y-2">
          {evidences.map((e) => <div key={e.clientId} className="flex min-h-[74px] items-start justify-center"><button type="button" disabled={inputDisabled} className="rpl-btn rpl-btn-danger px-2 py-2 text-xs" onClick={() => onRemove(e.clientId)} title="Hapus bukti"><i className="bi bi-trash" /></button></div>)}
          {enabled && <button type="button" className="rpl-btn rpl-btn-secondary whitespace-nowrap px-2 py-2 text-xs" onClick={onAdd}><i className="bi bi-plus-lg" /> Bukti</button>}
        </div>
      </td>
    </>
  );
}
