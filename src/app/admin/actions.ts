"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type AdminActionState = {
  ok?: boolean;
  error?: string;
  message?: string;
  temporaryPassword?: string;
};

function makeTemporaryPassword() {
  return `RPL!${randomBytes(10).toString("base64url")}`;
}

async function getAdminContext() {
  const profile = await requireProfile("admin");
  const session = await createClient();
  const { data: claims } = await session.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) throw new Error("Sesi admin tidak valid.");
  return { profile, userId, admin: createAdminClient() };
}

async function audit(
  userId: string,
  action: string,
  entityType: string,
  entityId?: string,
  programId?: string | null,
  metadata: Record<string, unknown> = {}
) {
  const admin = createAdminClient();
  await admin.from("audit_logs").insert({
    actor_user_id: userId,
    program_id: programId || null,
    action,
    entity_type: entityType,
    entity_id: entityId || null,
    metadata
  });
}

const participantSchema = z.object({
  registrationNo: z.string().trim().min(2).max(80),
  participantNo: z.string().trim().min(2).max(80),
  fullName: z.string().trim().min(3).max(180),
  email: z.string().trim().email(),
  programId: z.string().uuid(),
  phone: z.string().trim().max(60).optional().or(z.literal("")),
  birthDate: z.string().trim().optional().or(z.literal(""))
});

export async function createParticipantAdminAction(
  _previous: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const parsed = participantSchema.safeParse({
    registrationNo: formData.get("registrationNo"),
    participantNo: formData.get("participantNo"),
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    programId: formData.get("programId"),
    phone: formData.get("phone"),
    birthDate: formData.get("birthDate")
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Data mahasiswa tidak valid." };

  const { admin, userId } = await getAdminContext();
  const d = parsed.data;

  const [{ data: regMatch }, { data: noMatch }, { data: program }] = await Promise.all([
    admin.from("participants").select("id").eq("registration_no", d.registrationNo).maybeSingle(),
    admin.from("participants").select("id").eq("participant_no", d.participantNo).maybeSingle(),
    admin.from("programs").select("id,name").eq("id", d.programId).eq("active", true).maybeSingle()
  ]);
  if (regMatch) return { error: "Nomor pendaftaran sudah digunakan." };
  if (noMatch) return { error: "Nomor peserta sudah digunakan." };
  if (!program) return { error: "Program studi tidak ditemukan atau tidak aktif." };

  const temporaryPassword = makeTemporaryPassword();
  const email = d.email.toLowerCase();
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: { full_name: d.fullName, role: "participant" }
  });
  if (authError || !authData.user) return { error: authError?.message || "Gagal membuat akun mahasiswa." };

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .insert({
      user_id: authData.user.id,
      role: "participant",
      full_name: d.fullName,
      email,
      program_id: d.programId,
      active: true
    })
    .select("id")
    .single();
  if (profileError || !profile) {
    await admin.auth.admin.deleteUser(authData.user.id);
    return { error: profileError?.message || "Gagal membuat profil mahasiswa." };
  }

  const { data: participant, error: participantError } = await admin
    .from("participants")
    .insert({
      profile_id: profile.id,
      program_id: d.programId,
      participant_no: d.participantNo,
      registration_no: d.registrationNo,
      full_name: d.fullName,
      email,
      phone: d.phone || null,
      birth_date: d.birthDate || null
    })
    .select("id")
    .single();

  if (participantError || !participant) {
    await admin.auth.admin.deleteUser(authData.user.id);
    return { error: participantError?.message || "Gagal membuat data mahasiswa." };
  }

  await audit(userId, "ADMIN_CREATE_PARTICIPANT", "participant", participant.id, d.programId, {
    registration_no: d.registrationNo,
    participant_no: d.participantNo,
    full_name: d.fullName
  });
  revalidatePath("/admin");
  revalidatePath("/admin/mahasiswa");
  return {
    ok: true,
    message: "Calon mahasiswa berhasil dibuat. Simpan password sementara berikut dan berikan secara aman kepada mahasiswa.",
    temporaryPassword
  };
}

export async function updateParticipantAdminAction(
  _previous: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const id = String(formData.get("id") || "");
  if (!z.string().uuid().safeParse(id).success) return { error: "ID mahasiswa tidak valid." };
  const parsed = participantSchema.safeParse({
    registrationNo: formData.get("registrationNo"),
    participantNo: formData.get("participantNo"),
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    programId: formData.get("programId"),
    phone: formData.get("phone"),
    birthDate: formData.get("birthDate")
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Data mahasiswa tidak valid." };

  const { admin, userId } = await getAdminContext();
  const d = parsed.data;
  const { data: current } = await admin
    .from("participants")
    .select("id,profile_id,email,profile:profiles(user_id)")
    .eq("id", id)
    .maybeSingle();
  if (!current) return { error: "Mahasiswa tidak ditemukan." };

  const [{ data: regMatches }, { data: noMatches }, { data: program }] = await Promise.all([
    admin.from("participants").select("id").eq("registration_no", d.registrationNo).neq("id", id).limit(1),
    admin.from("participants").select("id").eq("participant_no", d.participantNo).neq("id", id).limit(1),
    admin.from("programs").select("id").eq("id", d.programId).eq("active", true).maybeSingle()
  ]);
  if (regMatches?.length) return { error: "Nomor pendaftaran sudah digunakan mahasiswa lain." };
  if (noMatches?.length) return { error: "Nomor peserta sudah digunakan mahasiswa lain." };
  if (!program) return { error: "Program studi tidak ditemukan atau tidak aktif." };

  const authUserId = (current.profile as any)?.user_id as string | undefined;
  const email = d.email.toLowerCase();
  if (authUserId && email !== String(current.email || "").toLowerCase()) {
    const { error: authError } = await admin.auth.admin.updateUserById(authUserId, {
      email,
      email_confirm: true,
      user_metadata: { full_name: d.fullName, role: "participant" }
    });
    if (authError) return { error: authError.message };
  }

  const { error: profileError } = await admin.from("profiles").update({
    full_name: d.fullName,
    email,
    program_id: d.programId
  }).eq("id", current.profile_id);
  if (profileError) return { error: profileError.message };

  const { error } = await admin.from("participants").update({
    program_id: d.programId,
    participant_no: d.participantNo,
    registration_no: d.registrationNo,
    full_name: d.fullName,
    email,
    phone: d.phone || null,
    birth_date: d.birthDate || null
  }).eq("id", id);
  if (error) return { error: error.message };

  await audit(userId, "ADMIN_UPDATE_PARTICIPANT", "participant", id, d.programId, {
    registration_no: d.registrationNo,
    participant_no: d.participantNo
  });
  revalidatePath("/admin/mahasiswa");
  revalidatePath(`/admin/mahasiswa/${id}`);
  return { ok: true, message: "Data mahasiswa berhasil diperbarui." };
}

export async function setParticipantActiveAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") || "");
  const active = String(formData.get("active") || "") === "true";
  const { admin, userId } = await getAdminContext();
  const { data: row } = await admin
    .from("participants")
    .select("id,profile_id,program_id,registration_no")
    .eq("id", id)
    .maybeSingle();
  if (!row) return;
  await admin.from("profiles").update({ active }).eq("id", row.profile_id);
  await audit(userId, active ? "ADMIN_ACTIVATE_PARTICIPANT" : "ADMIN_DEACTIVATE_PARTICIPANT", "participant", id, row.program_id, {
    registration_no: row.registration_no
  });
  revalidatePath("/admin/mahasiswa");
  revalidatePath(`/admin/mahasiswa/${id}`);
}

export async function resetParticipantPasswordAction(
  _previous: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const id = String(formData.get("id") || "");
  const { admin, userId } = await getAdminContext();
  const { data: row } = await admin
    .from("participants")
    .select("id,program_id,registration_no,profile:profiles(user_id)")
    .eq("id", id)
    .maybeSingle();
  const authUserId = (row?.profile as any)?.user_id as string | undefined;
  if (!row || !authUserId) return { error: "Akun mahasiswa tidak ditemukan." };
  const temporaryPassword = makeTemporaryPassword();
  const { error } = await admin.auth.admin.updateUserById(authUserId, { password: temporaryPassword });
  if (error) return { error: error.message };
  await audit(userId, "ADMIN_RESET_PARTICIPANT_PASSWORD", "participant", id, row.program_id, {
    registration_no: row.registration_no
  });
  return { ok: true, message: "Password mahasiswa berhasil direset. Password hanya ditampilkan pada hasil ini.", temporaryPassword };
}

export async function resetProdiPasswordAction(
  _previous: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const profileId = String(formData.get("profileId") || "");
  const requested = String(formData.get("password") || "").trim();
  const { admin, userId } = await getAdminContext();
  const { data: profile } = await admin
    .from("profiles")
    .select("id,user_id,program_id,full_name,role,program:programs(name)")
    .eq("id", profileId)
    .eq("role", "prodi")
    .maybeSingle();
  if (!profile) return { error: "Akun Prodi tidak ditemukan." };
  if (requested && requested.length < 10) return { error: "Password manual minimal 10 karakter." };

  const temporaryPassword = requested || makeTemporaryPassword();
  const { error } = await admin.auth.admin.updateUserById(profile.user_id, { password: temporaryPassword });
  if (error) return { error: error.message };
  await audit(userId, "ADMIN_RESET_PRODI_PASSWORD", "profile", profile.id, profile.program_id, {
    program: (profile.program as any)?.name || null
  });
  return { ok: true, message: "Password Prodi berhasil diperbarui. Password hanya ditampilkan pada hasil ini.", temporaryPassword };
}

export async function setProdiActiveAction(formData: FormData): Promise<void> {
  const profileId = String(formData.get("profileId") || "");
  const active = String(formData.get("active") || "") === "true";
  const { admin, userId } = await getAdminContext();
  const { data: profile } = await admin
    .from("profiles")
    .select("id,program_id,role,full_name")
    .eq("id", profileId)
    .eq("role", "prodi")
    .maybeSingle();
  if (!profile) return;
  await admin.from("profiles").update({ active }).eq("id", profileId);
  await audit(userId, active ? "ADMIN_ACTIVATE_PRODI" : "ADMIN_DEACTIVATE_PRODI", "profile", profileId, profile.program_id, {
    full_name: profile.full_name
  });
  revalidatePath("/admin/pengguna");
}

const managedUserSchema = z.object({
  profileId: z.string().uuid(),
  fullName: z.string().trim().min(3).max(180),
  email: z.string().trim().email(),
  active: z.boolean(),
  password: z.string().max(100).optional().or(z.literal(""))
});

export async function updateManagedUserAction(input: z.infer<typeof managedUserSchema>) {
  const parsed = managedUserSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message || "Data user tidak valid." };
  if (parsed.data.password && parsed.data.password.length < 10) return { ok: false, error: "Password baru minimal 10 karakter." };

  const { admin, userId } = await getAdminContext();
  const { data: target } = await admin.from("profiles").select("id,user_id,role,program_id,full_name,email,active").eq("id", parsed.data.profileId).maybeSingle();
  if (!target) return { ok: false, error: "User tidak ditemukan." };
  if (!parsed.data.active && target.user_id === userId) return { ok: false, error: "Admin tidak dapat menonaktifkan akun yang sedang digunakan sendiri." };

  const email = parsed.data.email.toLowerCase();
  const authPayload: Record<string, unknown> = {
    email,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.fullName, role: target.role }
  };
  if (parsed.data.password) authPayload.password = parsed.data.password;
  const { error: authError } = await admin.auth.admin.updateUserById(target.user_id, authPayload as any);
  if (authError) return { ok: false, error: authError.message };

  const { error: profileError } = await admin.from("profiles").update({
    full_name: parsed.data.fullName,
    email,
    active: parsed.data.active
  }).eq("id", target.id);
  if (profileError) return { ok: false, error: profileError.message };

  if (target.role === "participant") {
    const { error } = await admin.from("participants").update({ full_name: parsed.data.fullName, email }).eq("profile_id", target.id);
    if (error) return { ok: false, error: error.message };
  } else if (target.role === "assessor") {
    const { error } = await admin.from("assessors").update({ full_name: parsed.data.fullName, email, active: parsed.data.active }).eq("profile_id", target.id);
    if (error) return { ok: false, error: error.message };
  }

  await audit(userId, "ADMIN_UPDATE_USER", "profile", target.id, target.program_id, {
    role: target.role,
    email_changed: email !== String(target.email || "").toLowerCase(),
    password_changed: Boolean(parsed.data.password),
    active: parsed.data.active
  });
  revalidatePath("/admin/pengguna");
  revalidatePath("/admin/mahasiswa");
  revalidatePath("/admin/pengguna");
  return { ok: true };
}

export type ImportParticipantInput = {
  rowNumber: number;
  registrationNo: string;
  participantNo: string;
  fullName: string;
  email: string;
  programName: string;
  phone?: string;
  birthDate?: string;
  gender?: string;
  previousInstitution?: string;
  previousProgram?: string;
  graduationYear?: number | null;
  raw: Record<string, unknown>;
};

export type ImportParticipantResult = {
  rowNumber: number;
  registrationNo: string;
  fullName: string;
  status: "created" | "skipped" | "error";
  message: string;
  temporaryPassword?: string;
};

function canonicalImportDate(value?: string) {
  const input = String(value || "").trim();
  if (!input) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  const dmy = input.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  const parsed = new Date(input);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

export async function importParticipantsBatchAction(rows: ImportParticipantInput[]): Promise<{ ok: boolean; error?: string; results?: ImportParticipantResult[] }> {
  if (!Array.isArray(rows) || rows.length < 1 || rows.length > 20) return { ok: false, error: "Batch import harus berisi 1–20 baris." };
  const { admin, userId } = await getAdminContext();
  const { data: programs } = await admin.from("programs").select("id,name").eq("active", true);
  const programMap = new Map((programs || []).map((p: any) => [String(p.name).trim().toLowerCase(), p]));
  const results: ImportParticipantResult[] = [];

  for (const row of rows) {
    const registrationNo = String(row.registrationNo || "").trim();
    const participantNo = String(row.participantNo || "").trim();
    const fullName = String(row.fullName || "").trim();
    const email = String(row.email || "").trim().toLowerCase();
    const programName = String(row.programName || "").trim();
    const base = { rowNumber: Number(row.rowNumber || 0), registrationNo, fullName };

    if (!registrationNo || !participantNo || !fullName || !email || !programName) {
      results.push({ ...base, status: "error", message: "Kolom nomor_pendaftar, nomor_peserta, nama_lengkap, email, dan pilihan_1 wajib diisi." });
      continue;
    }
    if (!z.string().email().safeParse(email).success) {
      results.push({ ...base, status: "error", message: "Format email tidak valid." });
      continue;
    }
    const program = programMap.get(programName.toLowerCase());
    if (!program) {
      results.push({ ...base, status: "error", message: `Program Studi '${programName}' tidak ditemukan pada master programs.` });
      continue;
    }

    const [{ data: byReg }, { data: byNo }] = await Promise.all([
      admin.from("participants").select("id").eq("registration_no", registrationNo).maybeSingle(),
      admin.from("participants").select("id").eq("participant_no", participantNo).maybeSingle()
    ]);
    if (byReg || byNo) {
      results.push({ ...base, status: "skipped", message: "Sudah ada di database (nomor pendaftaran/peserta sama)." });
      continue;
    }

    const temporaryPassword = makeTemporaryPassword();
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName, role: "participant" }
    });
    if (authError || !authData.user) {
      results.push({ ...base, status: "error", message: authError?.message || "Gagal membuat akun Auth." });
      continue;
    }

    const { data: profile, error: profileError } = await admin.from("profiles").insert({
      user_id: authData.user.id,
      role: "participant",
      full_name: fullName,
      email,
      program_id: program.id,
      active: true
    }).select("id").single();
    if (profileError || !profile) {
      await admin.auth.admin.deleteUser(authData.user.id);
      results.push({ ...base, status: "error", message: profileError?.message || "Gagal membuat profil." });
      continue;
    }

    const { data: participant, error: participantError } = await admin.from("participants").insert({
      profile_id: profile.id,
      program_id: program.id,
      participant_no: participantNo,
      registration_no: registrationNo,
      full_name: fullName,
      birth_date: canonicalImportDate(row.birthDate),
      gender: row.gender ? String(row.gender).trim() : null,
      email,
      phone: row.phone ? String(row.phone).trim() : null,
      previous_institution: row.previousInstitution ? String(row.previousInstitution).trim() : null,
      previous_program: row.previousProgram ? String(row.previousProgram).trim() : null,
      graduation_year: row.graduationYear || null,
      legacy_payload: row.raw || {}
    }).select("id").single();

    if (participantError || !participant) {
      await admin.auth.admin.deleteUser(authData.user.id);
      results.push({ ...base, status: "error", message: participantError?.message || "Gagal membuat data peserta." });
      continue;
    }

    await audit(userId, "ADMIN_IMPORT_PARTICIPANT", "participant", participant.id, program.id, {
      registration_no: registrationNo,
      participant_no: participantNo,
      source_row: row.rowNumber
    });
    results.push({ ...base, status: "created", message: "Berhasil dibuat.", temporaryPassword });
  }

  revalidatePath("/admin");
  revalidatePath("/admin/mahasiswa");
  revalidatePath("/admin/pengguna");
  return { ok: true, results };
}
