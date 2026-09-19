import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils";
import { RecognitionResponse } from "./recognition-response";

export const metadata = { title: "Hasil Rekognisi" };

export default async function RecognitionPage() {
  const profile = await requireProfile("participant");
  const supabase = await createClient();
  const { data: participant } = await supabase.from("participants").select("*").eq("profile_id", profile.id).single();
  const { data: application } = participant ? await supabase.from("applications").select("*").eq("participant_id", participant.id).maybeSingle() : { data: null };

  if (!application || application.status !== "FINAL") {
    return (
      <div className="rpl-card p-8 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[var(--rpl-green-50)] text-[var(--rpl-green-800)]"><i className="bi bi-hourglass-split text-2xl" /></div>
        <h1 className="mt-4 text-xl font-black text-[var(--rpl-green-950)]">Hasil belum difinalisasi</h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">Hasil rekognisi akan muncul setelah proses asesmen dan yudisium Program Studi selesai.</p>
      </div>
    );
  }

  const { data: decisions } = await supabase
    .from("yudisium_decisions")
    .select("id,result,status,finalized_at,course_claim:course_claims(id,course:courses(code,name,credits))")
    .eq("application_id", application.id)
    .eq("status", "FINAL");
  const { data: assignment } = await supabase
    .from("assessor_assignments")
    .select("assessor1:assessors!assessor_assignments_assessor1_id_fkey(full_name,nip),assessor2:assessors!assessor_assignments_assessor2_id_fkey(full_name,nip)")
    .eq("application_id", application.id)
    .maybeSingle();
  const { data: response } = await supabase.from("recognition_responses").select("*").eq("application_id", application.id).maybeSingle();

  const totalSks = (decisions || []).reduce((sum, row: any) => sum + (row.result === "YA" ? Number(row.course_claim?.course?.credits || 0) : 0), 0);

  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-gradient-to-br from-[var(--rpl-green-900)] to-[var(--rpl-green-700)] p-5 sm:p-7 text-white">
        <div className="text-xs font-black uppercase tracking-[.12em] text-emerald-100">Hasil Final</div>
        <h1 className="mt-2 text-2xl sm:text-3xl font-black">Hasil Rekognisi Pembelajaran Lampau</h1>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <span className="rounded-full bg-white/12 px-3 py-1.5 font-bold">{(decisions || []).filter((d: any) => d.result === "YA").length} MK Direkognisi</span>
          <span className="rounded-full bg-white/12 px-3 py-1.5 font-bold">{totalSks} SKS</span>
          <span className="rounded-full bg-white/12 px-3 py-1.5 font-bold">Final {formatDateTime(application.finalized_at)}</span>
        </div>
      </section>

      <section className="rpl-card overflow-hidden">
        <div className="border-b border-[var(--line)] p-4 sm:p-5"><h2 className="font-black text-[var(--rpl-green-950)]">Keputusan per Mata Kuliah</h2></div>
        <div className="divide-y divide-[var(--line)]">
          {(decisions || []).map((row: any) => (
            <div key={row.id} className="flex items-center gap-3 p-4 sm:p-5">
              <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${row.result === "YA" ? "bg-emerald-100 text-emerald-700" : "bg-red-50 text-red-600"}`}><i className={`bi ${row.result === "YA" ? "bi-check-lg" : "bi-x-lg"}`} /></div>
              <div className="min-w-0 flex-1"><div className="text-xs font-black text-[var(--rpl-green-800)]">{row.course_claim?.course?.code}</div><div className="font-black">{row.course_claim?.course?.name}</div><div className="mt-1 text-xs text-[var(--muted)]">{row.course_claim?.course?.credits} SKS</div></div>
              <span className={`rpl-pill ${row.result === "YA" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{row.result === "YA" ? "Direkognisi" : "Tidak Direkognisi"}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rpl-card p-5">
          <h2 className="font-black text-[var(--rpl-green-950)]">Tim Asesor</h2>
          <div className="mt-4 space-y-3">
            {[assignment?.assessor1, assignment?.assessor2].filter(Boolean).map((assessor: any, index) => (
              <div key={index} className="rounded-xl border border-[var(--line)] p-3"><div className="text-[10px] font-black uppercase text-[var(--muted)]">Asesor {index + 1}</div><div className="mt-1 font-black">{assessor.full_name}</div><div className="text-xs text-[var(--muted)]">NIP {assessor.nip}</div></div>
            ))}
          </div>
        </section>
        <section className="rpl-card p-5">
          <h2 className="font-black text-[var(--rpl-green-950)]">Dokumen Hasil</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Berita acara dibentuk otomatis dari snapshot yudisium final.</p>
          <a className="rpl-btn rpl-btn-secondary mt-4" href={`/api/berita-acara/${application.id}`} target="_blank" rel="noopener noreferrer"><i className="bi bi-file-earmark-pdf" /> Berita Acara PDF</a>
        </section>
      </div>

      {response ? (
        <section className="rpl-card p-5">
          <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><i className="bi bi-check2-circle text-xl" /></div><div><div className="text-xs font-bold text-[var(--muted)]">Tanggapan sudah dikirim</div><div className="font-black">{response.response === "SETUJU" ? "Setuju" : "Tidak Setuju"}</div></div></div>
          {response.note && <p className="mt-3 rounded-xl bg-[#f7fbfa] p-3 text-sm leading-6">{response.note}</p>}
          <div className="mt-2 text-[11px] text-[var(--muted)]">{formatDateTime(response.responded_at)}</div>
        </section>
      ) : <RecognitionResponse />}
    </div>
  );
}
