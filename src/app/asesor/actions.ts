"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const entrySchema = z.object({
  claimId: z.string().uuid(),
  cpmkId: z.string().uuid().nullable().optional(),
  v: z.boolean(),
  a: z.boolean(),
  t: z.boolean(),
  m: z.boolean(),
  score: z.coerce.number().min(0).max(100),
  note: z.string().max(1500).optional().default("")
});

export async function saveScoresAction(applicationId: string, entries: Array<z.infer<typeof entrySchema>>) {
  const profile = await requireProfile("assessor");
  const supabase = await createClient();
  const { data: assessor } = await supabase.from("assessors").select("id,program_id").eq("profile_id", profile.id).eq("active", true).single();
  if (!assessor) return { ok: false, error: "Akun asesor tidak aktif." };
  const { data: assignment } = await supabase.from("assessor_assignments").select("id").eq("application_id", applicationId).or(`assessor1_id.eq.${assessor.id},assessor2_id.eq.${assessor.id}`).maybeSingle();
  if (!assignment) return { ok: false, error: "Peserta ini tidak diplot kepada Anda." };

  const parsed = z.array(entrySchema).min(1).safeParse(entries);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message || "Nilai tidak valid." };
  const { data: claims } = await supabase.from("course_claims").select("id,course_id,course:courses(id,assessment_type)").eq("application_id", applicationId);
  const claimMap = new Map((claims || []).map((c: any) => [c.id, c]));

  for (const entry of parsed.data) {
    const claim: any = claimMap.get(entry.claimId);
    if (!claim) return { ok: false, error: "Mata kuliah pada payload tidak valid." };
    const assessmentType = claim.course?.assessment_type as "OBE" | "NON_OBE";
    let cpmkId: string | null = null;
    let scoreScope = "COURSE";
    if (assessmentType === "OBE") {
      if (!entry.cpmkId) return { ok: false, error: "CPMK wajib dipilih untuk mata kuliah OBE." };
      const { data: cpmk } = await supabase.from("cpmks").select("id").eq("id", entry.cpmkId).eq("course_id", claim.course_id).eq("active", true).maybeSingle();
      if (!cpmk) return { ok: false, error: "CPMK tidak valid." };
      const { data: selected } = await supabase.from("course_claim_cpmks").select("cpmk_id").eq("course_claim_id", entry.claimId).eq("cpmk_id", cpmk.id).maybeSingle();
      if (!selected) return { ok: false, error: "CPMK tidak diajukan oleh peserta." };
      cpmkId = cpmk.id;
      scoreScope = cpmk.id;
    }
    const { error } = await supabase.from("assessor_scores").upsert({
      application_id: applicationId,
      course_claim_id: entry.claimId,
      assessor_id: assessor.id,
      assessment_type: assessmentType,
      cpmk_id: cpmkId,
      score_scope: scoreScope,
      v: entry.v,
      a: entry.a,
      t: entry.t,
      m: entry.m,
      score: entry.score,
      note: entry.note.trim() || null
    }, { onConflict: "assessor_id,course_claim_id,score_scope" });
    if (error) return { ok: false, error: error.message };
  }

  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (userId) await supabase.from("audit_logs").insert({ actor_user_id: userId, program_id: assessor.program_id, action: "SAVE_ASSESSOR_SCORES", entity_type: "application", entity_id: applicationId, metadata: { entry_count: parsed.data.length } });

  revalidatePath("/asesor");
  revalidatePath(`/asesor/${applicationId}`);
  return { ok: true };
}
