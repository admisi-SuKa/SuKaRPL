"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function getContext() {
  const profile = await requireProfile("prodi");
  if (!profile.program_id) throw new Error("Akun Prodi belum terhubung ke program studi.");
  const supabase = await createClient();
  return { profile, supabase, programId: profile.program_id };
}

async function logAction(action: string, entityType: string, entityId?: string, metadata: Record<string, unknown> = {}) {
  const { profile, supabase, programId } = await getContext();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return;
  await supabase.from("audit_logs").insert({ actor_user_id: userId, program_id: programId, action, entity_type: entityType, entity_id: entityId || null, metadata: { ...metadata, actor: profile.full_name } });
}

async function courseIsFrozen(supabase: Awaited<ReturnType<typeof createClient>>, courseId: string) {
  const { data } = await supabase
    .from("course_claims")
    .select("application:applications!inner(status)")
    .eq("course_id", courseId);
  const frozen = new Set(["SUBMITTED", "RETURNED", "ASSESSMENT", "YUDISIUM", "FINAL"]);
  return (data || []).some((row: any) => frozen.has(row.application?.status));
}

const courseSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  code: z.string().trim().min(2).max(30),
  name: z.string().trim().min(3).max(180),
  credits: z.coerce.number().positive().max(20),
  assessmentType: z.enum(["OBE", "NON_OBE"])
});

export async function saveCourseAction(input: z.infer<typeof courseSchema>) {
  const parsed = courseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message || "Data mata kuliah tidak valid." };
  const { supabase, programId } = await getContext();
  const payload = { program_id: programId, code: parsed.data.code.toUpperCase(), name: parsed.data.name, credits: parsed.data.credits, assessment_type: parsed.data.assessmentType, active: true };
  if (parsed.data.id) {
    if (await courseIsFrozen(supabase, parsed.data.id)) return { ok: false, error: "Mata kuliah sudah digunakan pada pengajuan terkunci/final. Buat mata kuliah baru untuk perubahan kurikulum." };
    const { error } = await supabase.from("courses").update(payload).eq("id", parsed.data.id).eq("program_id", programId);
    if (error) return { ok: false, error: error.message };
    await logAction("UPDATE_COURSE", "course", parsed.data.id);
  } else {
    const { data, error } = await supabase.from("courses").insert(payload).select().single();
    if (error) return { ok: false, error: error.message };
    await logAction("CREATE_COURSE", "course", data.id);
  }
  revalidatePath("/prodi/mata-kuliah");
  return { ok: true };
}

export async function deleteCourseAction(id: string) {
  const { supabase, programId } = await getContext();
  if (await courseIsFrozen(supabase, id)) return { ok: false, error: "Mata kuliah sudah digunakan pada pengajuan terkunci/final dan tidak dapat dinonaktifkan." };
  const { error } = await supabase.from("courses").update({ active: false }).eq("id", id).eq("program_id", programId);
  if (error) return { ok: false, error: error.message };
  await logAction("DEACTIVATE_COURSE", "course", id);
  revalidatePath("/prodi/mata-kuliah");
  return { ok: true };
}

const cpmkSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  courseId: z.string().uuid(),
  code: z.string().trim().min(2).max(30),
  sortOrder: z.coerce.number().int().min(1).max(999),
  description: z.string().trim().min(5).max(2000)
});

export async function saveCpmkAction(input: z.infer<typeof cpmkSchema>) {
  const parsed = cpmkSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message || "Data CPMK tidak valid." };
  const { supabase, programId } = await getContext();
  const { data: course } = await supabase.from("courses").select("id").eq("id", parsed.data.courseId).eq("program_id", programId).single();
  if (!course) return { ok: false, error: "Mata kuliah tidak ditemukan." };
  if (await courseIsFrozen(supabase, parsed.data.courseId)) return { ok: false, error: "CPMK sudah dipakai oleh pengajuan terkunci/final. Master CPMK tidak dapat diubah." };
  const payload = { course_id: parsed.data.courseId, code: parsed.data.code.toUpperCase(), sort_order: parsed.data.sortOrder, description: parsed.data.description, active: true };
  if (parsed.data.id) {
    const { error } = await supabase.from("cpmks").update(payload).eq("id", parsed.data.id).eq("course_id", parsed.data.courseId);
    if (error) return { ok: false, error: error.message };
    await logAction("UPDATE_CPMK", "cpmk", parsed.data.id);
  } else {
    const { data, error } = await supabase.from("cpmks").insert(payload).select().single();
    if (error) return { ok: false, error: error.message };
    await logAction("CREATE_CPMK", "cpmk", data.id);
  }
  revalidatePath("/prodi/mata-kuliah");
  return { ok: true };
}

export async function deleteCpmkAction(id: string) {
  const { supabase, programId } = await getContext();
  const { data: cpmk } = await supabase.from("cpmks").select("id,course:courses(program_id)").eq("id", id).single();
  if (!cpmk || (cpmk.course as any)?.program_id !== programId) return { ok: false, error: "CPMK tidak ditemukan." };
  // Fetch course_id directly because nested relationship only guarantees program ownership.
  const { data: cpmkRow } = await supabase.from("cpmks").select("course_id").eq("id", id).single();
  if (!cpmkRow || await courseIsFrozen(supabase, cpmkRow.course_id)) return { ok: false, error: "CPMK sudah dipakai oleh pengajuan terkunci/final dan tidak dapat dinonaktifkan." };
  const { error } = await supabase.from("cpmks").update({ active: false }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  await logAction("DEACTIVATE_CPMK", "cpmk", id);
  revalidatePath("/prodi/mata-kuliah");
  return { ok: true };
}

const assessorSchema = z.object({
  fullName: z.string().trim().min(3).max(180),
  nip: z.string().trim().min(3).max(60),
  email: z.string().trim().email(),
  temporaryPassword: z.string().min(10).max(100)
});

export async function createAssessorAction(input: z.infer<typeof assessorSchema>) {
  const parsed = assessorSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message || "Data asesor tidak valid." };
  const { programId } = await getContext();
  const admin = createAdminClient();

  const { data: existingAssessor } = await admin.from("assessors").select("id").eq("program_id", programId).eq("nip", parsed.data.nip).maybeSingle();
  if (existingAssessor) return { ok: false, error: "NIP asesor sudah terdaftar." };

  const { data: userData, error: userError } = await admin.auth.admin.createUser({
    email: parsed.data.email.toLowerCase(),
    password: parsed.data.temporaryPassword,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.fullName, role: "assessor" }
  });
  if (userError || !userData.user) return { ok: false, error: userError?.message || "Gagal membuat akun asesor." };

  const { data: profile, error: profileError } = await admin.from("profiles").insert({
    user_id: userData.user.id,
    role: "assessor",
    full_name: parsed.data.fullName,
    email: parsed.data.email.toLowerCase(),
    program_id: programId,
    active: true
  }).select().single();
  if (profileError || !profile) {
    await admin.auth.admin.deleteUser(userData.user.id);
    return { ok: false, error: profileError?.message || "Gagal membuat profil asesor." };
  }

  const { data: assessor, error: assessorError } = await admin.from("assessors").insert({
    profile_id: profile.id,
    program_id: programId,
    nip: parsed.data.nip,
    full_name: parsed.data.fullName,
    email: parsed.data.email.toLowerCase(),
    active: true
  }).select().single();
  if (assessorError || !assessor) {
    // Deleting the auth user cascades to the profile, avoiding half-provisioned accounts.
    await admin.auth.admin.deleteUser(userData.user.id);
    return { ok: false, error: assessorError?.message || "Gagal membuat data asesor." };
  }

  await logAction("CREATE_ASSESSOR", "assessor", assessor.id, { nip: parsed.data.nip });
  revalidatePath("/prodi/asesor");
  return { ok: true };
}

const assessorUpdateSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().trim().min(3).max(180),
  nip: z.string().trim().min(3).max(60),
  email: z.string().trim().email(),
  newPassword: z.string().max(100).optional().or(z.literal(""))
});

export async function updateAssessorAction(input: z.infer<typeof assessorUpdateSchema>) {
  const parsed = assessorUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message || "Data asesor tidak valid." };
  if (parsed.data.newPassword && parsed.data.newPassword.length < 10) return { ok: false, error: "Password baru minimal 10 karakter." };

  const { programId } = await getContext();
  const admin = createAdminClient();
  const { data: assessor } = await admin
    .from("assessors")
    .select("id,profile_id,nip,email,profile:profiles(user_id)")
    .eq("id", parsed.data.id)
    .eq("program_id", programId)
    .maybeSingle();
  if (!assessor) return { ok: false, error: "Asesor tidak ditemukan pada Prodi ini." };

  const { data: duplicate } = await admin
    .from("assessors")
    .select("id")
    .eq("program_id", programId)
    .eq("nip", parsed.data.nip)
    .neq("id", parsed.data.id)
    .limit(1);
  if (duplicate?.length) return { ok: false, error: "NIP sudah digunakan asesor lain." };

  const userId = (assessor.profile as any)?.user_id as string | undefined;
  if (!userId) return { ok: false, error: "Akun Auth asesor tidak ditemukan." };
  const email = parsed.data.email.toLowerCase();
  const authPayload: Record<string, unknown> = {
    email,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.fullName, role: "assessor" }
  };
  if (parsed.data.newPassword) authPayload.password = parsed.data.newPassword;
  const { error: authError } = await admin.auth.admin.updateUserById(userId, authPayload as any);
  if (authError) return { ok: false, error: authError.message };

  const { error: profileError } = await admin.from("profiles").update({
    full_name: parsed.data.fullName,
    email
  }).eq("id", assessor.profile_id);
  if (profileError) return { ok: false, error: profileError.message };

  const { error } = await admin.from("assessors").update({
    full_name: parsed.data.fullName,
    nip: parsed.data.nip,
    email
  }).eq("id", parsed.data.id).eq("program_id", programId);
  if (error) return { ok: false, error: error.message };

  await logAction("UPDATE_ASSESSOR", "assessor", parsed.data.id, { nip: parsed.data.nip, password_changed: Boolean(parsed.data.newPassword) });
  revalidatePath("/prodi/asesor");
  return { ok: true };
}

export async function setAssessorActiveAction(id: string, active: boolean) {
  const { supabase, programId } = await getContext();
  const { error } = await supabase.from("assessors").update({ active }).eq("id", id).eq("program_id", programId);
  if (error) return { ok: false, error: error.message };
  await logAction(active ? "ACTIVATE_ASSESSOR" : "DEACTIVATE_ASSESSOR", "assessor", id);
  revalidatePath("/prodi/asesor");
  return { ok: true };
}

export async function saveAssignmentAction(applicationId: string, assessor1Id: string, assessor2Id: string) {
  if (!applicationId || !assessor1Id || !assessor2Id) return { ok: false, error: "Peserta dan dua asesor wajib dipilih." };
  if (assessor1Id === assessor2Id) return { ok: false, error: "Asesor 1 dan Asesor 2 harus berbeda." };
  const { supabase, programId } = await getContext();
  const { data: application } = await supabase.from("applications").select("id,status").eq("id", applicationId).eq("program_id", programId).single();
  if (!application) return { ok: false, error: "Pengajuan tidak ditemukan." };
  if (application.status === "FINAL" || application.status === "DRAFT" || application.status === "RETURNED") return { ok: false, error: "Plotting asesor hanya dapat dilakukan setelah pengajuan dikirim dan sebelum hasil final." };

  const { data: assessors } = await supabase.from("assessors").select("id").eq("program_id", programId).eq("active", true).in("id", [assessor1Id, assessor2Id]);
  if (!assessors || assessors.length !== 2) return { ok: false, error: "Asesor tidak valid atau tidak aktif." };

  const { data: existingAssignment } = await supabase.from("assessor_assignments").select("id").eq("application_id", applicationId).maybeSingle();
  if (!existingAssignment) {
    const { data: payment } = await supabase.from("payments").select("status").eq("application_id", applicationId).maybeSingle();
    if (payment?.status !== "VERIFIED") return { ok: false, error: "Pembayaran belum terverifikasi. Verifikasi bukti pembayaran sebelum melakukan plotting asesor." };
  }

  const assignmentResult = existingAssignment
    ? await supabase.from("assessor_assignments").update({ assessor1_id: assessor1Id, assessor2_id: assessor2Id }).eq("id", existingAssignment.id)
    : await supabase.from("assessor_assignments").insert({ application_id: applicationId, assessor1_id: assessor1Id, assessor2_id: assessor2Id });
  if (assignmentResult.error) return { ok: false, error: assignmentResult.error.message };
  if (application.status === "SUBMITTED") await supabase.from("applications").update({ status: "ASSESSMENT" }).eq("id", applicationId);
  await logAction("ASSIGN_ASSESSORS", "application", applicationId, { assessor1Id, assessor2Id });
  revalidatePath("/prodi");
  revalidatePath("/prodi/asesor");
  revalidatePath("/prodi/pembayaran");
  revalidatePath(`/prodi/peserta/${applicationId}`);
  return { ok: true };
}

export async function returnApplicationAction(applicationId: string, note: string) {
  const cleaned = note.trim();
  if (!cleaned) return { ok: false, error: "Catatan revisi wajib diisi." };
  const { supabase, programId } = await getContext();
  const { data: application } = await supabase.from("applications").select("status").eq("id", applicationId).eq("program_id", programId).single();
  if (!application) return { ok: false, error: "Pengajuan tidak ditemukan." };
  if (!["SUBMITTED", "ASSESSMENT", "YUDISIUM", "RETURNED"].includes(application.status)) return { ok: false, error: "Pengajuan pada status ini tidak dapat dikembalikan untuk revisi." };
  // Returning for revision invalidates previous scores/decisions, atomically, so evidence changes are re-assessed.
  const { error } = await supabase.rpc("return_rpl_application", { p_application_id: applicationId, p_note: cleaned });
  if (error) return { ok: false, error: error.message };
  await logAction("RETURN_APPLICATION", "application", applicationId, { note: cleaned });
  revalidatePath("/prodi");
  revalidatePath(`/prodi/peserta/${applicationId}`);
  return { ok: true };
}

export async function saveProgramSettingsAction(headName: string, headNip: string) {
  const { supabase, programId } = await getContext();
  if (!headName.trim() || !headNip.trim()) return { ok: false, error: "Nama dan NIP Ketua Program Studi wajib diisi." };
  const { error } = await supabase.from("program_settings").upsert({ program_id: programId, head_name: headName.trim(), head_nip: headNip.trim() }, { onConflict: "program_id" });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/prodi/yudisium");
  return { ok: true };
}

export async function saveYudisiumAction(applicationId: string, decisions: Array<{ claimId: string; result: "YA" | "TIDAK" }>) {
  const { supabase, programId } = await getContext();
  const { data: application } = await supabase.from("applications").select("id,status").eq("id", applicationId).eq("program_id", programId).single();
  if (!application || application.status === "FINAL") return { ok: false, error: "Yudisium tidak dapat diubah." };
  const { data: claims } = await supabase.from("course_claims").select("id").eq("application_id", applicationId);
  const claimSet = new Set((claims || []).map((c) => c.id));
  if (!claimSet.size) return { ok: false, error: "Tidak ada mata kuliah yang diajukan." };
  const clean = decisions.filter((d) => claimSet.has(d.claimId) && (d.result === "YA" || d.result === "TIDAK"));
  if (!clean.length) return { ok: false, error: "Belum ada keputusan yudisium." };
  const rows = clean.map((d) => ({ application_id: applicationId, course_claim_id: d.claimId, result: d.result, status: "DRAFT", finalized_at: null }));
  const { error: decisionError } = await supabase.from("yudisium_decisions").upsert(rows, { onConflict: "course_claim_id" });
  if (decisionError) return { ok: false, error: decisionError.message };
  const { error: appStatusError } = await supabase.from("applications").update({ status: "YUDISIUM" }).eq("id", applicationId);
  if (appStatusError) return { ok: false, error: appStatusError.message };
  await logAction("SAVE_YUDISIUM", "application", applicationId, { decisions: clean.length });
  revalidatePath("/prodi/yudisium");
  revalidatePath(`/prodi/yudisium/${applicationId}`);
  return { ok: true };
}

export async function finalizeYudisiumAction(applicationId: string) {
  const { supabase, programId } = await getContext();
  const { data: app } = await supabase.from("applications").select("id,status").eq("id", applicationId).eq("program_id", programId).single();
  if (!app || app.status === "FINAL") return { ok: false, error: "Pengajuan tidak valid atau sudah final." };
  const { data: assignment } = await supabase.from("assessor_assignments").select("assessor1_id,assessor2_id").eq("application_id", applicationId).maybeSingle();
  if (!assignment) return { ok: false, error: "Dua asesor belum diplot." };

  const { data: claims } = await supabase.from("course_claims").select("id,course:courses(id,assessment_type)").eq("application_id", applicationId);
  if (!claims?.length) return { ok: false, error: "Tidak ada mata kuliah yang diajukan." };
  const { data: decisions } = await supabase.from("yudisium_decisions").select("course_claim_id,result").eq("application_id", applicationId).eq("status", "DRAFT");
  const decisionSet = new Set((decisions || []).map((d) => d.course_claim_id));
  if (claims.some((c) => !decisionSet.has(c.id))) return { ok: false, error: "Keputusan YA/TIDAK belum lengkap untuk seluruh mata kuliah." };

  const assessorIds = [assignment.assessor1_id, assignment.assessor2_id];
  const { data: scores } = await supabase.from("assessor_scores").select("assessor_id,course_claim_id,score_scope,score").eq("application_id", applicationId).in("assessor_id", assessorIds);

  for (const claim of claims as any[]) {
    let expected = 1;
    if (claim.course?.assessment_type === "OBE") {
      const { count } = await supabase.from("cpmks").select("id", { count: "exact", head: true }).eq("course_id", claim.course.id).eq("active", true);
      expected = count || 0;
      if (!expected) return { ok: false, error: `Mata kuliah OBE belum memiliki CPMK aktif.` };
    }
    for (const assessorId of assessorIds) {
      const filled = (scores || []).filter((s) => s.assessor_id === assessorId && s.course_claim_id === claim.id && s.score !== null).length;
      if (filled < expected) return { ok: false, error: "Nilai dari kedua asesor belum lengkap untuk seluruh mata kuliah." };
    }
  }

  // RPC performs both FINAL updates in one PostgreSQL transaction.
  const { error } = await supabase.rpc("finalize_rpl_application", { p_application_id: applicationId });
  if (error) return { ok: false, error: error.message };
  await logAction("FINALIZE_YUDISIUM", "application", applicationId);
  revalidatePath("/prodi");
  revalidatePath("/prodi/yudisium");
  revalidatePath(`/prodi/yudisium/${applicationId}`);
  return { ok: true };
}

export async function reopenYudisiumAction(applicationId: string) {
  const { supabase, programId } = await getContext();
  const { data: app } = await supabase.from("applications").select("status").eq("id", applicationId).eq("program_id", programId).single();
  if (!app || app.status !== "FINAL") return { ok: false, error: "Hasil belum final." };
  const { data: response } = await supabase.from("recognition_responses").select("id").eq("application_id", applicationId).maybeSingle();
  if (response) return { ok: false, error: "Finalisasi tidak dapat dibatalkan karena mahasiswa sudah mengirim tanggapan." };
  const { error } = await supabase.rpc("reopen_rpl_application", { p_application_id: applicationId });
  if (error) return { ok: false, error: error.message };
  await logAction("REOPEN_YUDISIUM", "application", applicationId);
  revalidatePath("/prodi/yudisium");
  revalidatePath(`/prodi/yudisium/${applicationId}`);
  return { ok: true };
}

export async function verifyPaymentAction(paymentId: string): Promise<void> {
  const { profile, supabase, programId } = await getContext();
  const { data: payment } = await supabase
    .from("payments")
    .select("id,application_id,status,application:applications!inner(program_id)")
    .eq("id", paymentId)
    .maybeSingle();
  if (!payment || (payment.application as any)?.program_id !== programId) throw new Error("Bukti pembayaran tidak ditemukan.");
  if (payment.status !== "SUBMITTED") throw new Error("Bukti pembayaran ini tidak sedang menunggu verifikasi.");

  const { error } = await supabase.from("payments").update({
    status: "VERIFIED",
    verification_note: null,
    verified_by: profile.id,
    verified_at: new Date().toISOString()
  }).eq("id", paymentId).eq("status", "SUBMITTED");
  if (error) throw new Error(error.message);

  await logAction("VERIFY_PAYMENT", "payment", paymentId, { applicationId: payment.application_id });
  revalidatePath("/prodi");
  revalidatePath("/prodi/pembayaran");
  revalidatePath("/prodi/asesor");
  revalidatePath(`/prodi/peserta/${payment.application_id}`);
}

export async function rejectPaymentAction(paymentId: string, formData: FormData): Promise<void> {
  const note = String(formData.get("verificationNote") || "").trim();
  if (!note) throw new Error("Catatan penolakan wajib diisi.");
  const { profile, supabase, programId } = await getContext();
  const { data: payment } = await supabase
    .from("payments")
    .select("id,application_id,status,application:applications!inner(program_id)")
    .eq("id", paymentId)
    .maybeSingle();
  if (!payment || (payment.application as any)?.program_id !== programId) throw new Error("Bukti pembayaran tidak ditemukan.");
  if (payment.status !== "SUBMITTED") throw new Error("Bukti pembayaran ini tidak sedang menunggu verifikasi.");

  const { error } = await supabase.from("payments").update({
    status: "REJECTED",
    verification_note: note,
    verified_by: profile.id,
    verified_at: new Date().toISOString()
  }).eq("id", paymentId).eq("status", "SUBMITTED");
  if (error) throw new Error(error.message);

  await logAction("REJECT_PAYMENT", "payment", paymentId, { applicationId: payment.application_id, note });
  revalidatePath("/prodi");
  revalidatePath("/prodi/pembayaran");
  revalidatePath("/prodi/asesor");
  revalidatePath(`/prodi/peserta/${payment.application_id}`);
}
