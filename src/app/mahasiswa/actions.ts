"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function getContext() {
  const profile = await requireProfile("participant");
  const supabase = await createClient();
  const { data: participant, error } = await supabase.from("participants").select("*").eq("profile_id", profile.id).single();
  if (error || !participant) throw new Error("Data peserta tidak ditemukan.");
  const { data: application } = await supabase.from("applications").select("*").eq("participant_id", participant.id).maybeSingle();
  return { profile, participant, application, supabase };
}

async function audit(action: string, entityType: string, entityId?: string, metadata: Record<string, unknown> = {}) {
  const { profile, supabase } = await getContext();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return;
  await supabase.from("audit_logs").insert({ actor_user_id: userId, program_id: profile.program_id, action, entity_type: entityType, entity_id: entityId || null, metadata });
}

export type StartApplicationState = { error?: string };

export async function createApplicationAction(
  _previous: StartApplicationState,
  _formData: FormData
): Promise<StartApplicationState> {
  // Verify the current session as a participant first. The actual creation is
  // performed server-side with the secret-key client after ownership has been
  // established. This avoids a fragile first-write dependency on browser RLS
  // while still preventing a participant from creating an application for
  // another account.
  const profile = await requireProfile("participant");
  const supabase = await createClient();
  const { data: participant, error: participantError } = await supabase
    .from("participants")
    .select("id,program_id")
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (participantError || !participant) {
    return { error: "Data calon mahasiswa tidak ditemukan. Silakan keluar lalu login kembali." };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { error: "Konfigurasi server belum lengkap. Hubungi administrator SuKaRPL." };
  }

  // Idempotent: if the application was already created by a previous click,
  // continue to it instead of producing a duplicate-key error.
  const { data: existing, error: existingError } = await admin
    .from("applications")
    .select("id")
    .eq("participant_id", participant.id)
    .maybeSingle();

  if (existingError) {
    return { error: `Gagal memeriksa pengajuan: ${existingError.message}` };
  }
  if (existing) redirect("/mahasiswa/pengajuan");

  const { data, error } = await admin
    .from("applications")
    .insert({ participant_id: participant.id, program_id: participant.program_id, status: "DRAFT" })
    .select("id")
    .single();

  if (error || !data) {
    // A double click/race can still reach the unique constraint. Treat it as
    // success if the row now exists.
    if (error?.code === "23505") {
      const { data: raced } = await admin
        .from("applications")
        .select("id")
        .eq("participant_id", participant.id)
        .maybeSingle();
      if (raced) redirect("/mahasiswa/pengajuan");
    }
    return { error: error?.message || "Gagal membuat pengajuan RPL." };
  }

  // Audit failure must not cancel a successfully created application.
  await audit("CREATE_APPLICATION", "application", data.id).catch(() => undefined);
  revalidatePath("/mahasiswa");
  revalidatePath("/mahasiswa/pengajuan");
  redirect("/mahasiswa/pengajuan");
}

export async function toggleCourseClaimAction(courseId: string, selected: boolean) {
  const { participant, application, supabase } = await getContext();
  if (!application) return { ok: false, error: "Mulai pengajuan terlebih dahulu." };
  if (!(["DRAFT", "RETURNED"] as string[]).includes(application.status)) return { ok: false, error: "Pengajuan sudah dikunci dan tidak dapat diubah." };

  const { data: course } = await supabase.from("courses").select("id,program_id,active").eq("id", courseId).single();
  if (!course || course.program_id !== participant.program_id || !course.active) return { ok: false, error: "Mata kuliah tidak valid." };

  if (selected) {
    const { error } = await supabase.from("course_claims").upsert({ application_id: application.id, course_id: courseId }, { onConflict: "application_id,course_id" });
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from("course_claims").delete().eq("application_id", application.id).eq("course_id", courseId);
    if (error) return { ok: false, error: error.message };
  }
  await audit(selected ? "ADD_COURSE_CLAIM" : "REMOVE_COURSE_CLAIM", "course", courseId);
  revalidatePath("/mahasiswa/pengajuan");
  revalidatePath("/mahasiswa");
  return { ok: true };
}

export async function toggleCpmkClaimAction(claimId: string, cpmkId: string, selected: boolean) {
  const { application, supabase } = await getContext();
  if (!application) return { ok: false, error: "Pengajuan belum dibuat." };
  if (!(["DRAFT", "RETURNED"] as string[]).includes(application.status)) return { ok: false, error: "Pengajuan sudah dikunci dan tidak dapat diubah." };

  const { data: claim } = await supabase.from("course_claims").select("id,course_id,course:courses(assessment_type)").eq("id", claimId).eq("application_id", application.id).maybeSingle();
  if (!claim || (claim.course as any)?.assessment_type !== "OBE") return { ok: false, error: "Mata kuliah/claim CPMK tidak valid." };

  const { data: cpmk } = await supabase.from("cpmks").select("id,course_id,active").eq("id", cpmkId).eq("course_id", claim.course_id).eq("active", true).maybeSingle();
  if (!cpmk) return { ok: false, error: "CPMK tidak valid untuk mata kuliah ini." };

  if (selected) {
    const { error } = await supabase.from("course_claim_cpmks").upsert({ course_claim_id: claimId, cpmk_id: cpmkId }, { onConflict: "course_claim_id,cpmk_id" });
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from("course_claim_cpmks").delete().eq("course_claim_id", claimId).eq("cpmk_id", cpmkId);
    if (error) return { ok: false, error: error.message };
  }
  await audit(selected ? "ADD_CPMK_CLAIM" : "REMOVE_CPMK_CLAIM", "cpmk", cpmkId, { course_claim_id: claimId });
  revalidatePath("/mahasiswa/pengajuan");
  return { ok: true };
}

const evidenceSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  evidenceTypeId: z.string().min(1),
  title: z.string().trim().min(3, "Judul bukti minimal 3 karakter.").max(180),
  url: z.string().trim().url("Link bukti tidak valid.").refine((v) => /^https?:\/\//i.test(v), "Link harus menggunakan http atau https."),
  description: z.string().trim().max(1000).optional(),
  claimIds: z.array(z.string().uuid()).min(1, "Pilih minimal satu mata kuliah.")
});

export async function saveEvidenceAction(input: z.infer<typeof evidenceSchema>) {
  const parsed = evidenceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message || "Data bukti tidak valid." };
  const { application, supabase } = await getContext();
  if (!application) return { ok: false, error: "Pengajuan belum dibuat." };
  if (!(["DRAFT", "RETURNED"] as string[]).includes(application.status)) return { ok: false, error: "Pengajuan sudah dikunci." };

  const { data: validClaims } = await supabase.from("course_claims").select("id").eq("application_id", application.id).in("id", parsed.data.claimIds);
  if (!validClaims || validClaims.length !== parsed.data.claimIds.length) return { ok: false, error: "Pilihan mata kuliah untuk bukti tidak valid." };

  let evidenceId = parsed.data.id || "";
  if (evidenceId) {
    const { data: existing } = await supabase.from("evidences").select("id").eq("id", evidenceId).eq("application_id", application.id).maybeSingle();
    if (!existing) return { ok: false, error: "Bukti tidak ditemukan." };
    const { error } = await supabase.from("evidences").update({
      evidence_type_id: parsed.data.evidenceTypeId,
      title: parsed.data.title,
      url: parsed.data.url,
      description: parsed.data.description || null
    }).eq("id", evidenceId);
    if (error) return { ok: false, error: error.message };
  } else {
    const { data, error } = await supabase.from("evidences").insert({
      application_id: application.id,
      evidence_type_id: parsed.data.evidenceTypeId,
      title: parsed.data.title,
      url: parsed.data.url,
      description: parsed.data.description || null
    }).select().single();
    if (error || !data) return { ok: false, error: error?.message || "Gagal menyimpan bukti." };
    evidenceId = data.id;
  }

  // Add desired links first so a transient insert error never wipes existing links.
  const desiredLinks = parsed.data.claimIds.map((claimId) => ({ course_claim_id: claimId, evidence_id: evidenceId }));
  const { error: linkError } = await supabase.from("claim_evidences").upsert(desiredLinks, { onConflict: "course_claim_id,evidence_id" });
  if (linkError) return { ok: false, error: linkError.message };

  const { data: existingLinks } = await supabase.from("claim_evidences").select("course_claim_id").eq("evidence_id", evidenceId);
  const desired = new Set(parsed.data.claimIds);
  const staleIds = (existingLinks || []).map((x) => x.course_claim_id).filter((id) => !desired.has(id));
  if (staleIds.length) {
    const { error: staleError } = await supabase.from("claim_evidences").delete().eq("evidence_id", evidenceId).in("course_claim_id", staleIds);
    if (staleError) return { ok: false, error: staleError.message };
  }

  await audit(parsed.data.id ? "UPDATE_EVIDENCE" : "ADD_EVIDENCE", "evidence", evidenceId);
  revalidatePath("/mahasiswa/pengajuan");
  revalidatePath("/mahasiswa");
  return { ok: true };
}

export async function deleteEvidenceAction(evidenceId: string) {
  const { application, supabase } = await getContext();
  if (!application || !(["DRAFT", "RETURNED"] as string[]).includes(application.status)) return { ok: false, error: "Bukti tidak dapat dihapus." };
  const { error } = await supabase.from("evidences").delete().eq("id", evidenceId).eq("application_id", application.id);
  if (error) return { ok: false, error: error.message };
  await audit("DELETE_EVIDENCE", "evidence", evidenceId);
  revalidatePath("/mahasiswa/pengajuan");
  revalidatePath("/mahasiswa");
  return { ok: true };
}

export async function submitApplicationAction() {
  const { application, supabase } = await getContext();
  if (!application) return { ok: false, error: "Pengajuan belum dibuat." };
  if (!(["DRAFT", "RETURNED"] as string[]).includes(application.status)) return { ok: false, error: "Pengajuan sudah dikirim." };

  const { data: claims } = await supabase.from("course_claims").select("id").eq("application_id", application.id);
  if (!claims?.length) return { ok: false, error: "Pilih minimal satu mata kuliah." };
  const claimIds = claims.map((c) => c.id);

  const { data: obeClaims } = await supabase.from("course_claims").select("id,course:courses(assessment_type)").eq("application_id", application.id);
  const obeClaimIds = (obeClaims || []).filter((c: any) => c.course?.assessment_type === "OBE").map((c) => c.id);
  if (obeClaimIds.length) {
    const { data: selectedCpmks } = await supabase.from("course_claim_cpmks").select("course_claim_id").in("course_claim_id", obeClaimIds);
    const coveredObe = new Set((selectedCpmks || []).map((x) => x.course_claim_id));
    const missingCpmkClaims = obeClaimIds.filter((id) => !coveredObe.has(id));
    if (missingCpmkClaims.length) return { ok: false, error: `${missingCpmkClaims.length} mata kuliah OBE belum memiliki CPMK yang dicentang.` };
  }

  const { data: links } = await supabase.from("claim_evidences").select("course_claim_id").in("course_claim_id", claimIds);
  const covered = new Set((links || []).map((x) => x.course_claim_id));
  const uncovered = claimIds.filter((id) => !covered.has(id));
  if (uncovered.length) return { ok: false, error: `${uncovered.length} mata kuliah belum memiliki bukti.` };

  const { error } = await supabase.from("applications").update({ status: "SUBMITTED", submitted_at: new Date().toISOString(), return_note: null }).eq("id", application.id);
  if (error) return { ok: false, error: error.message };
  await audit("SUBMIT_APPLICATION", "application", application.id, { course_count: claims.length });
  revalidatePath("/mahasiswa");
  revalidatePath("/mahasiswa/pengajuan");
  return { ok: true };
}

export async function submitRecognitionResponseAction(response: "SETUJU" | "TIDAK_SETUJU", note: string) {
  const { participant, application, supabase } = await getContext();
  if (!application || application.status !== "FINAL") return { ok: false, error: "Hasil belum final." };
  if (response === "TIDAK_SETUJU" && !note.trim()) return { ok: false, error: "Alasan keberatan wajib diisi." };
  const { data: existing } = await supabase.from("recognition_responses").select("id").eq("application_id", application.id).maybeSingle();
  if (existing) return { ok: false, error: "Tanggapan sudah pernah dikirim dan tidak dapat diubah." };
  const { error } = await supabase.from("recognition_responses").insert({
    application_id: application.id,
    participant_id: participant.id,
    response,
    note: note.trim() || null
  });
  if (error) return { ok: false, error: error.message };
  await audit("RESPOND_RECOGNITION", "application", application.id, { response });
  revalidatePath("/mahasiswa/hasil");
  return { ok: true };
}

// -----------------------------------------------------------------------------
// V5: penyimpanan draft RPL secara batch.
// Checkbox/input di browser hanya mengubah state lokal. Database baru ditulis
// ketika peserta menekan Simpan Draft atau Kirim Pengajuan.
// -----------------------------------------------------------------------------

const supportingEvidenceDraftSchema = z.object({
  url: z.string().trim().url("Link bukti tidak valid.").refine((v) => /^https?:\/\//i.test(v), "Link bukti harus menggunakan http atau https."),
  description: z.string().trim().max(1500, "Deskripsi bukti maksimal 1500 karakter.").optional().default("")
});

const cpmkDraftSchema = z.object({
  cpmkId: z.string().uuid(),
  evidences: z.array(supportingEvidenceDraftSchema).max(30)
});

const courseDraftSchema = z.object({
  courseId: z.string().uuid(),
  cpmks: z.array(cpmkDraftSchema).max(100).default([]),
  evidences: z.array(supportingEvidenceDraftSchema).max(30).default([])
});

const rplBatchDraftSchema = z.object({
  courses: z.array(courseDraftSchema).max(200)
});

export type RplBatchDraftInput = z.infer<typeof rplBatchDraftSchema>;

async function persistRplBatchDraft(input: RplBatchDraftInput, submit: boolean) {
  const parsed = rplBatchDraftSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || "Data pengajuan tidak valid." };
  }

  const { application, supabase } = await getContext();
  if (!application) return { ok: false, error: "Pengajuan RPL belum dibuat." };
  if (!( ["DRAFT", "RETURNED"] as string[]).includes(application.status)) {
    return { ok: false, error: "Pengajuan sudah dikunci dan tidak dapat diubah." };
  }

  const { data, error } = await supabase.rpc("save_participant_rpl_draft", {
    p_payload: parsed.data,
    p_submit: submit
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/mahasiswa");
  revalidatePath("/mahasiswa/pengajuan");
  revalidatePath("/prodi");
  return { ok: true, data };
}

export async function saveRplDraftAction(input: RplBatchDraftInput) {
  return persistRplBatchDraft(input, false);
}

export async function submitRplDraftAction(input: RplBatchDraftInput) {
  return persistRplBatchDraft(input, true);
}
