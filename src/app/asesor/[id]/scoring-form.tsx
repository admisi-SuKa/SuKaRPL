"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveScoresAction } from "../actions";

type Evidence = { id: string; url: string; description?: string | null };
type Cpmk = { id: string; code: string; description: string; evidences: Evidence[] };
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

  function update(key: string, patch: Partial<Entry>) {
    setEntries((old) => ({ ...old, [key]: { ...old[key], ...patch } }));
  }

  function save() {
    setMessage(null);
    const payload = Object.values(entries) as Entry[];
    if (payload.some((entry) => entry.score === "" || Number(entry.score) < 0 || Number(entry.score) > 100)) {
      setMessage({ ok: false, text: "Semua nilai wajib diisi antara 0 sampai 100." });
      return;
    }
    startTransition(async () => {
      const result = await saveScoresAction(applicationId, payload.map((entry) => ({ ...entry, score: Number(entry.score) })));
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
            <h3 className="text-sm font-black text-[var(--rpl-green-950)]">Penilaian VATM & Nilai</h3>
            {claim.assessmentType === "OBE" ? (
              <div className="mt-3 space-y-3">
                {claim.cpmks.map((cp) => {
                  const key = `${claim.id}:${cp.id}`;
                  return <ScoreRow key={key} title={cp.code} description={cp.description} evidences={cp.evidences} entry={entries[key]} disabled={disabled} onChange={(patch) => update(key, patch)} />;
                })}
                {!claim.cpmks.length && <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Mata kuliah OBE ini belum memiliki CPMK aktif. Hubungi Program Studi.</div>}
              </div>
            ) : (
              <div className="mt-3"><ScoreRow title="Mata Kuliah" description="Penilaian Non OBE dilakukan langsung pada mata kuliah." evidences={claim.evidences} entry={entries[`${claim.id}:COURSE`]} disabled={disabled} onChange={(patch) => update(`${claim.id}:COURSE`, patch)} /></div>
            )}
          </div>
        </section>
      ))}

      {!disabled && <div className="sticky bottom-20 z-20 flex justify-end rounded-2xl border border-[var(--line)] bg-white/95 p-3 shadow-xl backdrop-blur lg:bottom-4"><button type="button" className="rpl-btn rpl-btn-primary w-full sm:w-auto" disabled={pending} onClick={save}><i className="bi bi-floppy" /> {pending ? "Menyimpan..." : "Simpan Seluruh Nilai"}</button></div>}
    </div>
  );
}

function ScoreRow({ title, description, evidences, entry, disabled, onChange }: { title: string; description: string; evidences: Evidence[]; entry: Entry; disabled: boolean; onChange: (patch: Partial<Entry>) => void }) {
  if (!entry) return null;
  return (
    <div className="rounded-xl border border-[var(--line)] p-3 sm:p-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(280px,1.2fr)_230px_110px_minmax(220px,.8fr)] xl:items-start">
        <div>
          <div className="text-xs font-black text-[var(--rpl-green-800)]">{title}</div>
          <div className="mt-1 text-sm leading-6">{description}</div>
          <div className="mt-3 border-t border-[var(--line)] pt-3">
            <div className="text-[10px] font-black uppercase tracking-wide text-[var(--muted)]">Bukti Dukung CPMK</div>
            <div className="mt-2 space-y-2">
              {evidences.map((evidence) => <a key={evidence.id} href={evidence.url} target="_blank" rel="noopener noreferrer" className="block rounded-lg border border-[var(--line)] bg-[#fbfdfc] p-2.5 hover:bg-emerald-50"><div className="flex items-center gap-2 text-xs font-black text-[var(--rpl-green-800)]"><i className="bi bi-box-arrow-up-right" /> Buka Bukti</div>{evidence.description && <div className="mt-1 text-xs leading-5 text-[var(--muted)]">{evidence.description}</div>}</a>)}
              {!evidences.length && <div className="text-xs text-amber-700">Belum ada bukti dukung.</div>}
            </div>
          </div>
        </div>
        <div><div className="rpl-label">VATM</div><div className="flex gap-2">{(["v","a","t","m"] as const).map((key) => <label key={key} className={`grid h-10 w-10 cursor-pointer place-items-center rounded-lg border text-xs font-black uppercase ${entry[key] ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-[var(--line)]"}`}><input type="checkbox" className="sr-only" disabled={disabled} checked={entry[key]} onChange={(ev) => onChange({ [key]: ev.target.checked })} />{key.toUpperCase()}</label>)}</div></div>
        <div><label className="rpl-label">Nilai</label><input className="rpl-input text-center font-black" disabled={disabled} type="number" min="0" max="100" step="0.01" value={entry.score} onChange={(ev) => onChange({ score: ev.target.value })} placeholder="0-100" /></div>
        <div><label className="rpl-label">Catatan</label><input className="rpl-input" disabled={disabled} value={entry.note} onChange={(ev) => onChange({ note: ev.target.value })} placeholder="Catatan asesor..." /></div>
      </div>
    </div>
  );
}
