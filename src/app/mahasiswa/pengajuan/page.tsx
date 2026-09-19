import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ApplicationBuilder } from "./application-builder";

export const metadata = { title: "Pengajuan RPL" };

export default async function ApplicationPage() {
  const profile = await requireProfile("participant");
  const supabase = await createClient();
  const { data: participant } = await supabase.from("participants").select("id,program_id").eq("profile_id", profile.id).single();
  if (!participant) redirect("/mahasiswa");
  const { data: application } = await supabase.from("applications").select("*").eq("participant_id", participant.id).maybeSingle();
  if (!application) redirect("/mahasiswa");

  const [{ data: courses }, { data: claims }, { data: evidenceTypes }, { data: evidences }] = await Promise.all([
    supabase.from("courses").select("id,code,name,credits,assessment_type").eq("program_id", participant.program_id).eq("active", true).order("code"),
    supabase.from("course_claims").select("id,course_id").eq("application_id", application.id),
    supabase.from("evidence_types").select("id,title").eq("active", true).order("sort_order"),
    supabase.from("evidences").select("id,evidence_type_id,title,url,description").eq("application_id", application.id).order("created_at", { ascending: false })
  ]);

  const courseIds = (courses || []).map((c) => c.id);
  const claimIds = (claims || []).map((c) => c.id);
  const [{ data: cpmks }, { data: claimCpmks }] = await Promise.all([
    courseIds.length ? supabase.from("cpmks").select("id,course_id,code,description,sort_order").in("course_id", courseIds).eq("active", true).order("sort_order") : Promise.resolve({ data: [] as any[] }),
    claimIds.length ? supabase.from("course_claim_cpmks").select("course_claim_id,cpmk_id").in("course_claim_id", claimIds) : Promise.resolve({ data: [] as any[] })
  ]);

  const evidenceRows = evidences || [];
  let links: Array<{ course_claim_id: string; evidence_id: string }> = [];
  if (evidenceRows.length) {
    const { data } = await supabase.from("claim_evidences").select("course_claim_id,evidence_id").in("evidence_id", evidenceRows.map((e) => e.id));
    links = data || [];
  }

  return <ApplicationBuilder
    status={application.status}
    returnNote={application.return_note}
    courses={(courses || []) as never[]}
    claims={(claims || []) as never[]}
    cpmks={(cpmks || []) as never[]}
    claimCpmks={(claimCpmks || []) as never[]}
    evidenceTypes={(evidenceTypes || []) as never[]}
    evidences={evidenceRows.map((e) => ({ ...e, claim_ids: links.filter((l) => l.evidence_id === e.id).map((l) => l.course_claim_id) })) as never[]}
  />;
}
