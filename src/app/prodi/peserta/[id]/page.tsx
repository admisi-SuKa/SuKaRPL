import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils";
import { ParticipantControls } from "./participant-controls";

export default async function ProdiParticipantDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile(["prodi", "admin"]);
  const supabase = await createClient();
  const { data: application } = await supabase.from("applications").select("*,participant:participants(*)").eq("id", id).eq("program_id", profile.program_id!).maybeSingle();
  if (!application) notFound();

  const [{ data: claims }, { data: evidences }, { data: assignment }, { data: assessors }] = await Promise.all([
    supabase.from("course_claims").select("id,course_id,course:courses(code,name,credits,assessment_type)").eq("application_id", id),
    supabase.from("evidences").select("id,evidence_type_id,title,url,description,type:evidence_types(title)").eq("application_id", id),
    supabase.from("assessor_assignments").select("assessor1_id,assessor2_id,assessor1:assessors!assessor_assignments_assessor1_id_fkey(full_name,nip),assessor2:assessors!assessor_assignments_assessor2_id_fkey(full_name,nip)").eq("application_id", id).maybeSingle(),
    supabase.from("assessors").select("id,full_name,nip").eq("program_id", profile.program_id!).eq("active", true).order("full_name")
  ]);
  const claimIds = (claims || []).map((c) => c.id);
  let selectedCpmks: any[] = [];
  if (claimIds.length) {
    const { data } = await supabase.from("course_claim_cpmks").select("course_claim_id,cpmk:cpmks(id,code,description,sort_order)").in("course_claim_id", claimIds);
    selectedCpmks = data || [];
  }
  let links: any[] = [];
  if (evidences?.length) {
    const { data } = await supabase.from("claim_evidences").select("evidence_id,course_claim_id").in("evidence_id", evidences.map((e) => e.id));
    links = data || [];
  }
  const participant: any = application.participant;

  return (
    <div className="space-y-5">
      <section className="rpl-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div><div className="text-xs font-black text-[var(--rpl-green-800)]">{participant?.participant_no}</div><h1 className="mt-1 text-2xl font-black text-[var(--rpl-green-950)]">{participant?.full_name}</h1><p className="mt-1 text-sm text-[var(--muted)]">{participant?.email || "-"} • Dikirim {formatDateTime(application.submitted_at)}</p></div>
          <StatusBadge status={application.status} />
        </div>
        {application.return_note && application.status === "RETURNED" && <div className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900"><strong>Catatan revisi:</strong> {application.return_note}</div>}
      </section>

      <ParticipantControls applicationId={id} status={application.status} assessors={(assessors || []) as any[]} assignment={assignment ? { assessor1_id: assignment.assessor1_id, assessor2_id: assignment.assessor2_id } : null} />

      <section className="rpl-card p-5">
        <h2 className="text-lg font-black text-[var(--rpl-green-950)]">Mata Kuliah Diajukan</h2>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {(claims || []).map((claim: any) => {
            const selected = selectedCpmks.filter((row: any) => row.course_claim_id === claim.id && row.cpmk).sort((a: any, b: any) => Number(a.cpmk.sort_order || 0) - Number(b.cpmk.sort_order || 0));
            return (
              <div key={claim.id} className="rounded-xl border border-[var(--line)] p-4">
                <div className="flex items-start justify-between gap-2"><div><div className="text-xs font-black text-[var(--rpl-green-800)]">{claim.course?.code}</div><div className="mt-1 font-black">{claim.course?.name}</div></div><span className="rpl-pill bg-[#f0f6f4] text-[#5b706a]">{claim.course?.credits} SKS</span></div>
                <div className="mt-2 text-xs text-[var(--muted)]">{claim.course?.assessment_type === "OBE" ? `OBE • ${selected.length} CPMK diajukan` : "Non OBE"}</div>
                {claim.course?.assessment_type === "OBE" && <div className="mt-3 space-y-1.5">{selected.map((row: any) => <div key={row.cpmk.id} className="rounded-lg bg-emerald-50 px-2.5 py-2 text-xs"><strong>{row.cpmk.code}</strong> — {row.cpmk.description}</div>)}</div>}
              </div>
            );
          })}
        </div>
      </section>

      <section className="rpl-card p-5">
        <h2 className="text-lg font-black text-[var(--rpl-green-950)]">Bukti RPL</h2>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {(evidences || []).map((e: any) => {
            const linkedClaimIds = links.filter((l) => l.evidence_id === e.id).map((l) => l.course_claim_id);
            const linkedCourses = (claims || []).filter((c: any) => linkedClaimIds.includes(c.id));
            return <article key={e.id} className="rounded-xl border border-[var(--line)] bg-[#fbfdfc] p-4"><div className="text-[10px] font-black uppercase tracking-wide text-[var(--rpl-orange)]">{e.type?.title || e.evidence_type_id}</div><h3 className="mt-1 font-black">{e.title}</h3>{e.description && <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{e.description}</p>}<div className="mt-3 flex flex-wrap gap-1">{linkedCourses.map((c: any) => <span key={c.id} className="rpl-pill bg-emerald-50 text-emerald-800">{c.course?.code}</span>)}</div><a className="rpl-btn rpl-btn-secondary mt-3 text-xs" href={e.url} target="_blank" rel="noopener noreferrer"><i className="bi bi-box-arrow-up-right" /> Buka Bukti</a></article>;
          })}
          {!evidences?.length && <div className="text-sm text-[var(--muted)]">Belum ada bukti.</div>}
        </div>
      </section>

      {assignment && <section className="rpl-card p-5"><h2 className="font-black text-[var(--rpl-green-950)]">Asesor Terplot</h2><div className="mt-3 grid gap-3 sm:grid-cols-2">{[assignment.assessor1, assignment.assessor2].map((a: any, i) => <div key={i} className="rounded-xl border border-[var(--line)] p-3"><div className="text-[10px] font-black uppercase text-[var(--muted)]">Asesor {i + 1}</div><div className="mt-1 font-black">{a?.full_name}</div><div className="text-xs text-[var(--muted)]">NIP {a?.nip}</div></div>)}</div></section>}
    </div>
  );
}
