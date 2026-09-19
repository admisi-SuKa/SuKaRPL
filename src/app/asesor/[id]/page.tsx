import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import { ParticipantPhoto } from "@/components/participant-photo";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { extractLegacyPhotoUrl } from "@/lib/participant-photo";
import { ScoringForm } from "./scoring-form";

export default async function AssessorParticipantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile("assessor");
  const supabase = await createClient();

  const { data: assessor } = await supabase.from("assessors").select("id").eq("profile_id", profile.id).single();
  if (!assessor) notFound();

  const { data: assignment } = await supabase
    .from("assessor_assignments")
    .select("assessor1_id,assessor2_id")
    .eq("application_id", id)
    .or(`assessor1_id.eq.${assessor.id},assessor2_id.eq.${assessor.id}`)
    .maybeSingle();
  if (!assignment) notFound();

  const { data: app } = await supabase
    .from("applications")
    .select("id,status,participant:participants(participant_no,registration_no,full_name,legacy_payload)")
    .eq("id", id)
    .single();
  if (!app) notFound();

  const { data: claims } = await supabase
    .from("course_claims")
    .select("id,course_id,course:courses(id,code,name,credits,assessment_type)")
    .eq("application_id", id);

  const claimIds = (claims || []).map((claim) => claim.id);
  let selectedCpmks: any[] = [];
  let supportingEvidences: any[] = [];
  let scores: any[] = [];

  if (claimIds.length) {
    const [cp, evidence, score] = await Promise.all([
      supabase
        .from("course_claim_cpmks")
        .select("course_claim_id,cpmk:cpmks(id,course_id,code,description,sort_order)")
        .in("course_claim_id", claimIds),
      supabase
        .from("supporting_evidences")
        .select("id,course_claim_id,cpmk_id,url,description")
        .in("course_claim_id", claimIds)
        .order("created_at"),
      supabase
        .from("assessor_scores")
        .select("course_claim_id,cpmk_id,score_scope,v,a,t,m,score,note")
        .eq("application_id", id)
        .eq("assessor_id", assessor.id)
    ]);
    selectedCpmks = cp.data || [];
    supportingEvidences = evidence.data || [];
    scores = score.data || [];
  }

  const rows = (claims || []).map((claim: any) => ({
    id: claim.id,
    code: claim.course?.code,
    name: claim.course?.name,
    credits: Number(claim.course?.credits || 0),
    assessmentType: claim.course?.assessment_type,
    cpmks: selectedCpmks
      .filter((row: any) => row.course_claim_id === claim.id && row.cpmk)
      .sort((a: any, b: any) => Number(a.cpmk.sort_order || 0) - Number(b.cpmk.sort_order || 0))
      .map((row: any) => ({
        id: row.cpmk.id,
        code: row.cpmk.code,
        description: row.cpmk.description,
        evidences: supportingEvidences
          .filter((e: any) => e.course_claim_id === claim.id && e.cpmk_id === row.cpmk.id)
          .map((e: any) => ({ id: e.id, url: e.url, description: e.description || "" }))
      })),
    evidences: supportingEvidences
      .filter((e: any) => e.course_claim_id === claim.id && e.cpmk_id === null)
      .map((e: any) => ({ id: e.id, url: e.url, description: e.description || "" })),
    existing: scores
      .filter((score: any) => score.course_claim_id === claim.id)
      .map((score: any) => ({
        scoreScope: score.score_scope,
        cpmkId: score.cpmk_id,
        v: score.v,
        a: score.a,
        t: score.t,
        m: score.m,
        score: score.score === null ? null : Number(score.score),
        note: score.note || ""
      }))
  }));

  return (
    <div className="space-y-5">
      <section className="rpl-card p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <ParticipantPhoto
              registrationNo={(app.participant as any)?.registration_no}
              directUrl={extractLegacyPhotoUrl((app.participant as any)?.legacy_payload)}
              name={(app.participant as any)?.full_name}
              className="h-16 w-16 sm:h-20 sm:w-20"
              iconClassName="text-3xl"
            />
            <div>
              <div className="text-xs font-black text-[var(--rpl-green-800)]">{(app.participant as any)?.participant_no}</div>
              <h1 className="mt-1 text-2xl font-black text-[var(--rpl-green-950)]">{(app.participant as any)?.full_name}</h1>
              <p className="mt-1 text-xs text-[var(--muted)]">Posisi Anda: {assignment.assessor1_id === assessor.id ? "Asesor 1" : "Asesor 2"}</p>
            </div>
          </div>
          <StatusBadge status={app.status} />
        </div>
      </section>
      <ScoringForm applicationId={id} status={app.status} claims={rows as any[]} />
    </div>
  );
}
