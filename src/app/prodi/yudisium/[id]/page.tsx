import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils";
import { YudisiumEditor } from "./yudisium-editor";

function avg(values: number[]) { return values.length ? (values.reduce((a,b) => a+b,0)/values.length).toFixed(2) : ""; }

export default async function YudisiumDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile("prodi");
  const supabase = await createClient();
  const { data: app } = await supabase.from("applications").select("*,participant:participants(participant_no,full_name)").eq("id", id).eq("program_id", profile.program_id!).maybeSingle();
  if (!app) notFound();
  const [{ data: claims }, { data: assignment }, { data: scores }, { data: decisions }, { data: response }] = await Promise.all([
    supabase.from("course_claims").select("id,course:courses(id,code,name,credits,assessment_type)").eq("application_id", id),
    supabase.from("assessor_assignments").select("assessor1_id,assessor2_id,assessor1:assessors!assessor_assignments_assessor1_id_fkey(full_name,nip),assessor2:assessors!assessor_assignments_assessor2_id_fkey(full_name,nip)").eq("application_id", id).maybeSingle(),
    supabase.from("assessor_scores").select("assessor_id,course_claim_id,score").eq("application_id", id),
    supabase.from("yudisium_decisions").select("course_claim_id,result,status").eq("application_id", id).in("status", app.status === "FINAL" ? ["FINAL"] : ["DRAFT"]),
    supabase.from("recognition_responses").select("response,note,responded_at").eq("application_id", id).maybeSingle()
  ]);
  const rows = (claims || []).map((claim: any) => {
    const a1values = (scores || []).filter((s) => s.assessor_id === assignment?.assessor1_id && s.course_claim_id === claim.id && s.score !== null).map((s) => Number(s.score));
    const a2values = (scores || []).filter((s) => s.assessor_id === assignment?.assessor2_id && s.course_claim_id === claim.id && s.score !== null).map((s) => Number(s.score));
    const current = decisions?.find((d) => d.course_claim_id === claim.id)?.result as "YA" | "TIDAK" | undefined;
    return { id: claim.id, code: claim.course?.code, name: claim.course?.name, credits: Number(claim.course?.credits || 0), assessmentType: claim.course?.assessment_type, a1: avg(a1values), a2: avg(a2values), current };
  });

  return <div className="space-y-5"><section className="rpl-card p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="text-xs font-black text-[var(--rpl-green-800)]">{(app.participant as any)?.participant_no}</div><h1 className="mt-1 text-2xl font-black text-[var(--rpl-green-950)]">{(app.participant as any)?.full_name}</h1><p className="mt-1 text-xs text-[var(--muted)]">Finalisasi: {formatDateTime(app.finalized_at)}</p></div><StatusBadge status={app.status} /></div>{assignment && <div className="mt-4 grid gap-2 sm:grid-cols-2"><div className="rounded-xl bg-[#f7fbfa] p-3 text-sm"><span className="text-xs font-bold text-[var(--muted)]">Asesor 1</span><div className="font-black">{(assignment.assessor1 as any)?.full_name}</div></div><div className="rounded-xl bg-[#f7fbfa] p-3 text-sm"><span className="text-xs font-bold text-[var(--muted)]">Asesor 2</span><div className="font-black">{(assignment.assessor2 as any)?.full_name}</div></div></div>}{response && <div className={`mt-4 rounded-xl p-3 text-sm ${response.response === "SETUJU" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}><strong>Tanggapan mahasiswa: {response.response === "SETUJU" ? "Setuju" : "Tidak Setuju"}</strong>{response.note && <div className="mt-1">{response.note}</div>}</div>}</section><YudisiumEditor applicationId={id} status={app.status} claims={rows as any[]} /></div>;
}
