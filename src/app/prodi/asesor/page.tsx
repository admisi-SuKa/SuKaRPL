import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AssessorManager } from "./assessor-manager";

export const metadata = { title: "Asesor & Plotting" };

export default async function AssessorsPage() {
  const profile = await requireProfile(["prodi", "admin"]);
  const supabase = await createClient();
  const programId = profile.program_id!;
  const [{ data: assessors }, { data: applications }] = await Promise.all([
    supabase.from("assessors").select("id,full_name,nip,email,active").eq("program_id", programId).order("full_name"),
    supabase.from("applications").select("id,status,participant:participants(full_name,participant_no)").eq("program_id", programId).in("status", ["SUBMITTED","ASSESSMENT","YUDISIUM"]).order("updated_at", { ascending: false })
  ]);
  const appIds = (applications || []).map((a) => a.id);
  let assignments: any[] = [];
  if (appIds.length) {
    const { data } = await supabase.from("assessor_assignments").select("application_id,assessor1_id,assessor2_id").in("application_id", appIds);
    assignments = data || [];
  }
  const rows = (applications || []).map((a: any) => ({ ...a, assignment: assignments.find((x) => x.application_id === a.id) || null }));
  return <AssessorManager assessors={(assessors || []) as any[]} applications={rows as any[]} />;
}
