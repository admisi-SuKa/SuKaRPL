"use client";

import { useMemo, useState, useTransition } from "react";
import * as XLSX from "xlsx";
import { importParticipantsBatchAction, type ImportParticipantInput, type ImportParticipantResult } from "../actions";

function text(value: unknown) { return String(value ?? "").trim(); }
function numberOrNull(value: unknown) {
  const cleaned = text(value).replace(/[^0-9]/g, "");
  return cleaned ? Number(cleaned) : null;
}
function pick(row: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) if (row[key] !== undefined && text(row[key])) return row[key];
  return "";
}
function normalizeRows(rows: Record<string, unknown>[]): ImportParticipantInput[] {
  return rows.map((row, index) => ({
    rowNumber: index + 2,
    registrationNo: text(pick(row, "nomor_pendaftar", "nomor pendaftar")),
    participantNo: text(pick(row, "nomor_peserta", "nomor peserta")),
    fullName: text(pick(row, "nama_lengkap", "nama lengkap")),
    email: text(pick(row, "email")),
    programName: text(pick(row, "pilihan_1", "pilihan 1")),
    phone: text(pick(row, "nohp", "telp")),
    birthDate: text(pick(row, "tgl_lahir", "tanggal_lahir", "tanggal lahir")),
    gender: text(pick(row, "jenis_kelamin", "jenis kelamin")),
    previousInstitution: text(pick(row, "nama_pt", "nama pt")),
    previousProgram: text(pick(row, "asal_jurusan", "asal jurusan")),
    graduationYear: numberOrNull(pick(row, "tahun_ijazah", "tahun_lulus", "tahun ijazah", "tahun lulus")),
    raw: row
  }));
}
function csvCell(value: unknown) { return `"${String(value ?? "").replaceAll('"', '""')}"`; }

export function ImportParticipants() {
  const [pending, startTransition] = useTransition();
  const [rows, setRows] = useState<ImportParticipantInput[]>([]);
  const [filename, setFilename] = useState("");
  const [results, setResults] = useState<ImportParticipantResult[]>([]);
  const [error, setError] = useState("");

  const validPreview = useMemo(() => rows.filter((r) => r.registrationNo && r.participantNo && r.fullName).slice(0, 8), [rows]);
  const created = results.filter((r) => r.status === "created");

  async function onFile(file?: File) {
    if (!file) return;
    setError(""); setResults([]); setRows([]); setFilename(file.name);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array", cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      if (!ws) throw new Error("Sheet pertama tidak ditemukan.");
      const parsed = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "", raw: false, dateNF: "yyyy-mm-dd" });
      if (!parsed.length) throw new Error("File tidak memiliki data.");
      const normalized = normalizeRows(parsed);
      const missingHeaders = ["nomor_pendaftar","nomor_peserta","nama_lengkap","email","pilihan_1"].filter((h) => !Object.keys(parsed[0] || {}).map((x) => x.toLowerCase()).includes(h));
      if (missingHeaders.length) throw new Error(`Header wajib tidak ditemukan: ${missingHeaders.join(", ")}`);
      setRows(normalized);
    } catch (e) { setError(e instanceof Error ? e.message : "Gagal membaca file."); }
  }

  function runImport() {
    if (!rows.length) return;
    setError(""); setResults([]);
    startTransition(async () => {
      const all: ImportParticipantResult[] = [];
      for (let i = 0; i < rows.length; i += 15) {
        const response = await importParticipantsBatchAction(rows.slice(i, i + 15));
        if (!response.ok) { setError(response.error || `Gagal pada batch ${Math.floor(i/15)+1}.`); break; }
        all.push(...(response.results || []));
        setResults([...all]);
      }
    });
  }

  function downloadCredentials() {
    const lines = [["nomor_pendaftaran","nama_lengkap","temporary_password"], ...created.map((r) => [r.registrationNo, r.fullName, r.temporaryPassword || ""])].map((r) => r.map(csvCell).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([lines], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `sukarpl-import-credentials-${Date.now()}.csv`; a.click(); URL.revokeObjectURL(url);
  }

  return <div className="space-y-5">
    <section className="rpl-card p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="text-lg font-black text-[var(--rpl-green-950)]">Import Calon Mahasiswa</h2><p className="mt-1 max-w-3xl text-sm text-[var(--muted)]">Menerima XLSX, XLS, atau CSV. Seluruh kolom asli tetap disimpan di <code>legacy_payload</code>, sedangkan kolom utama dipetakan ke data peserta.</p></div><label className="rpl-btn rpl-btn-secondary cursor-pointer"><i className="bi bi-file-earmark-spreadsheet" /> Pilih File<input className="hidden" type="file" accept=".xlsx,.xls,.csv,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(e) => onFile(e.target.files?.[0])} /></label></div>
      <div className="mt-4 rounded-xl bg-[#f6faf9] p-4 text-xs leading-6 text-[var(--muted)]"><strong className="text-[var(--rpl-green-900)]">Kolom wajib:</strong> nomor_pendaftar, nomor_peserta, nama_lengkap, email, pilihan_1. Kolom seperti tgl_lahir, nohp, jenis_kelamin, nama_pt, asal_jurusan, tahun_ijazah/tahun_lulus, data_khusus, dan kolom lain pada format lama tetap dapat ikut diimport.</div>
    </section>

    {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div>}

    {rows.length > 0 && <section className="rpl-card overflow-hidden"><div className="flex flex-col gap-3 border-b border-[var(--line)] p-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-black">Preview</h2><p className="mt-1 text-xs text-[var(--muted)]">{filename} • {rows.length} baris</p></div><button className="rpl-btn rpl-btn-primary" disabled={pending} onClick={runImport}><i className="bi bi-database-up" /> {pending ? "Mengimport..." : `Import ${rows.length} Baris`}</button></div><div className="overflow-x-auto"><table className="w-full min-w-[800px] text-sm"><thead><tr className="bg-[#f3f8f6] text-left text-xs uppercase text-[var(--rpl-green-800)]"><th className="p-3">Baris</th><th className="p-3">No Pendaftaran</th><th className="p-3">No Peserta</th><th className="p-3">Nama</th><th className="p-3">Email</th><th className="p-3">Prodi</th></tr></thead><tbody className="divide-y divide-[var(--line)]">{validPreview.map((r) => <tr key={r.rowNumber}><td className="p-3">{r.rowNumber}</td><td className="p-3 font-bold">{r.registrationNo}</td><td className="p-3">{r.participantNo}</td><td className="p-3 font-bold">{r.fullName}</td><td className="p-3">{r.email}</td><td className="p-3">{r.programName}</td></tr>)}</tbody></table></div>{rows.length > 8 && <div className="border-t border-[var(--line)] p-3 text-center text-xs text-[var(--muted)]">Menampilkan 8 baris pertama dari {rows.length} data.</div>}</section>}

    {results.length > 0 && <section className="rpl-card overflow-hidden"><div className="flex flex-col gap-3 border-b border-[var(--line)] p-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-black">Hasil Import</h2><p className="mt-1 text-xs text-[var(--muted)]">Berhasil {created.length} • Dilewati {results.filter((r) => r.status === "skipped").length} • Error {results.filter((r) => r.status === "error").length}</p></div>{created.length > 0 && <button className="rpl-btn rpl-btn-secondary" onClick={downloadCredentials}><i className="bi bi-download" /> Download Password Sementara</button>}</div><div className="max-h-[520px] overflow-auto divide-y divide-[var(--line)]">{results.map((r, i) => <div key={`${r.rowNumber}-${i}`} className="flex gap-3 p-3 text-sm"><span className={`rpl-pill shrink-0 ${r.status === "created" ? "bg-emerald-50 text-emerald-700" : r.status === "skipped" ? "bg-amber-50 text-amber-800" : "bg-red-50 text-red-700"}`}>{r.status}</span><div><div className="font-bold">Baris {r.rowNumber} • {r.registrationNo || "-"} • {r.fullName || "-"}</div><div className="text-xs text-[var(--muted)]">{r.message}</div></div></div>)}</div></section>}
  </div>;
}
