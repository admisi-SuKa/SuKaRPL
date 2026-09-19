import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ApplicationBuilder } from "./application-builder";

export const metadata = { title: "Pengajuan RPL" };

export default async function ApplicationPage() {
  const profile = await requireProfile("participant");
  const supabase = await createClient();

  const { data: participant } = await supabase
    .from("participants")
    .select("id,program_id")
    .eq("profile_id", profile.id)
    .single();
  if (!participant) redirect("/mahasiswa");

  const { data: application } = await supabase
    .from("applications")
    .select("id,status,return_note")
    .eq("participant_id", participant.id)
    .maybeSingle();
  if (!application) redirect("/mahasiswa");

  // Muat data master dan draft secara paralel. Tidak ada query ulang ketika
  // peserta hanya mencentang CPMK atau mengetik bukti di browser.
  const [{ data: courses }, { data: claims }] = await Promise.all([
    supabase
      .from("courses")
      .select("id,code,name,credits,assessment_type")
      .eq("program_id", participant.program_id)
      .eq("active", true)
      .order("code"),
    supabase
      .from("course_claims")
      .select("id,course_id")
      .eq("application_id", application.id)
  ]);

  const courseIds = (courses || []).map((course) => course.id);
  const claimIds = (claims || []).map((claim) => claim.id);

  const [{ data: cpmks }, { data: claimCpmks }, { data: supportingEvidences }] = await Promise.all([
    courseIds.length
      ? supabase
          .from("cpmks")
          .select("id,course_id,code,description,sort_order")
          .in("course_id", courseIds)
          .eq("active", true)
          .order("sort_order")
      : Promise.resolve({ data: [] as any[] }),
    claimIds.length
      ? supabase
          .from("course_claim_cpmks")
          .select("course_claim_id,cpmk_id")
          .in("course_claim_id", claimIds)
      : Promise.resolve({ data: [] as any[] }),
    claimIds.length
      ? supabase
          .from("supporting_evidences")
          .select("id,course_claim_id,cpmk_id,url,description")
          .in("course_claim_id", claimIds)
          .order("created_at")
      : Promise.resolve({ data: [] as any[] })
  ]);

  return (
    <ApplicationBuilder
      status={application.status}
      returnNote={application.return_note}
      courses={(courses || []) as never[]}
      claims={(claims || []) as never[]}
      cpmks={(cpmks || []) as never[]}
      claimCpmks={(claimCpmks || []) as never[]}
      supportingEvidences={(supportingEvidences || []) as never[]}
    />
  );
}
