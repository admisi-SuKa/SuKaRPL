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
  revalidatePath("/admin/prodi");
}
