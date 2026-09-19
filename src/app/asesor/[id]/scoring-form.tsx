"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveScoresAction } from "../actions";

type Evidence = { id: string; title: string; url: string; description?: string | null; type: string };
type Cpmk = { id: string; code: string; description: string };
type Existing = { scoreScope: string; cpmkId: string | null; v: boolean; a: boolean; t: boolean; m: boolean; score: number | null; note: string };
type Claim = { id: string; code: string; name: string; credits: number; assessmentType: "OBE" | "NON_OBE"; cpmks: Cpmk[]; evidences: Evidence[]; existing: Existing[] };
type Entry = { claimId: string; cpmkId: string | null; v: boolean; a: boolean; t: boolean; m: boolean; score: string; note: string };

export function ScoringForm({ applicationId, status, claims }: { applicationId: string; status: string; claims: Claim[] }) {
  const router = useRouter();
  const disabled = status === "FINAL";
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const initial = useMemo(() => {
    const map: Record<string, Entry> = {};
    for (const claim of claims) {
      if (claim.assessmentType === "OBE") {
        for (const cp of claim.cpmks) {
          const old = claim.existing.find((x) => x.scoreScope === cp.id);
          map[`${claim.id}:${cp.id}`] = { claimId: claim.id, cpmkId: cp.id, v: old?.v || false, a: old?.a || false, t: old?.t || false, m: old?.m || false, score: old?.score == null ? "" : String(old.score), note: old?.note || "" };
        }
      } else {
        const old = claim.existing.find((x) => x.scoreScope === "COURSE");
        map[`${claim.id}:COURSE`] = { claimId: claim.id, cpmkId: null, v: old?.v || false, a: old?.a || false, t: old?.t || false, m: old?.m || false, score: old?.score == null ? "" : String(old.score), note: old?.note || "" };
      }
    }
    return map;
  }, [claims]);
  const [entries, setEntries] = useState<Record<string, Entry>>(initial);

  function update(key: string, patch: Partial<Entry>) { setEntries((old) => ({ ...old, [key]: { ...old[key], ...patch } })); }

  function save() {
    setMessage(null);
    const payload = Object.values(entries);
    if (payload.some((e) => e.score === "" || Number(e.score) < 0 || Number(e.score) > 100)) { setMessage({ ok: false, text: "Semua nilai wajib diisi antara 0 sampai 100." }); return; }
    startTransition(async () => {
      const result = await saveScoresAction(applicationId, payload.map((e) => ({ ...e, score: Number(e.score) })));
      setMessage(result.ok ? { ok: true, text: "Seluruh nilai berhasil disimpan." } : { ok: false, text: result.error || "Gagal menyimpan nilai." });
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {message && <div className={`rounded-xl border p-3 text-sm font-bold ${message.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>{message.text}</div>}
      {disabled && <div className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800"><i className="bi bi-lock-fill mr-2" />Hasil sudah final. Nilai hanya dapat dilihat.</div>}

      {claims.map((claim) => (
        <section key={claim.id} className="rpl-card overflow-hidden">
          <div className="border-b border-[var(--line)] bg-[#fbfdfc] p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-black text-[var(--rpl-green-800)]">{claim.code}</span><span className="rpl-pill bg-white text-[#60736e]">{claim.credits} SKS</span><span className="rpl-pill bg-white text-[#60736e]">{claim.assessmentType}</span></div>
            <h2 className="mt-1 text-lg font-black">{claim.name}</h2>
          </div>

          <div className="p-4 sm:p-5">
            <div>
              <h3 className="text-sm font-black text-[var(--rpl-green-950)]">Bukti Mahasiswa</h3>
              <div className="mt-3 grid gap-2 lg:grid-cols-2">{claim.evidences.map((e) => <a key={e.id} href={e.url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 rounded-xl border border-[var(--line)] p-3 hover:bg-[#f8fcfa]"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--rpl-green-50)] text-[var(--rpl-green-800)]"><i className="bi bi-box-arrow-up-right" /></div><div className="min-w-0"><div className="text-[10px] font-black uppercase text-[var(--rpl-orange)]">{e.type}</div><div className="text-sm font-black">{e.title}</div>{e.description && <div className="mt-1 text-xs leading-5 text-[var(--muted)]">{e.description}</div>}</div></a>)}{!claim.evidences.length && <div className="text-sm text-[var(--muted)]">Tidak ada bukti terhubung.</div>}</div>
            </div>

            <div className="mt-5 border-t border-[var(--line)] pt-5">
              <h3 className="text-sm font-black text-[var(--rpl-green-950)]">Penilaian VATM & Nilai</h3>
              {claim.assessmentType === "OBE" ? (
                <div className="mt-3 space-y-3">{claim.cpmks.map((cp) => {
                  const key = `${claim.id}:${cp.id}`; const e = entries[key];
                  return <ScoreRow key={key} title={cp.code} description={cp.description} entry={e} disabled={disabled} onChange={(patch) => update(key, patch)} />;
                })}{!claim.cpmks.length && <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Mata kuliah OBE ini belum memiliki CPMK aktif. Hubungi Program Studi.</div>}</div>
              ) : (
                <div className="mt-3"><ScoreRow title="Mata Kuliah" description="Penilaian Non OBE dilakukan langsung pada mata kuliah." entry={entries[`${claim.id}:COURSE`]} disabled={disabled} onChange={(patch) => update(`${claim.id}:COURSE`, patch)} /></div>
              )}
            </div>
          </div>
        </section>
      ))}

      {!disabled && <div className="sticky bottom-20 z-20 flex justify-end rounded-2xl border border-[var(--line)] bg-white/95 p-3 shadow-xl backdrop-blur lg:bottom-4"><button type="button" className="rpl-btn rpl-btn-primary w-full sm:w-auto" disabled={pending} onClick={save}><i className="bi bi-floppy" /> {pending ? "Menyimpan..." : "Simpan Seluruh Nilai"}</button></div>}
    </div>
  );
}

function ScoreRow({ title, description, entry, disabled, onChange }: { title: string; description: string; entry: Entry; disabled: boolean; onChange: (patch: Partial<Entry>) => void }) {
  if (!entry) return null;
  return (
    <div className="rounded-xl border border-[var(--line)] p-3 sm:p-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(230px,1fr)_230px_110px_minmax(220px,.8fr)] xl:items-center">
        <div><div className="text-xs font-black text-[var(--rpl-green-800)]">{title}</div><div className="mt-1 text-sm leading-6">{description}</div></div>
        <div><div className="rpl-label">VATM</div><div className="flex gap-2">{(["v","a","t","m"] as const).map((k) => <label key={k} className={`grid h-10 w-10 cursor-pointer place-items-center rounded-lg border text-xs font-black uppercase ${entry[k] ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-[var(--line)]"}`}><input type="checkbox" className="sr-only" disabled={disabled} checked={entry[k]} onChange={(ev) => onChange({ [k]: ev.target.checked })} />{k.toUpperCase()}</label>)}</div></div>
        <div><label className="rpl-label">Nilai</label><input className="rpl-input text-center font-black" disabled={disabled} type="number" min="0" max="100" step="0.01" value={entry.score} onChange={(ev) => onChange({ score: ev.target.value })} placeholder="0-100" /></div>
        <div><label className="rpl-label">Catatan</label><input className="rpl-input" disabled={disabled} value={entry.note} onChange={(ev) => onChange({ note: ev.target.value })} placeholder="Catatan asesor..." /></div>
      </div>
    </div>
  );
}
