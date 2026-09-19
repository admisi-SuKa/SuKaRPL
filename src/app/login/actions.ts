"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { roleHome } from "@/lib/auth";
import type { UserRole } from "@/lib/types";

export type LoginState = { error?: string };

type LoginRole = Extract<UserRole, "participant" | "prodi" | "assessor" | "admin">;

type ProfileLookup = {
  email: string | null;
  user_id: string;
  active: boolean;
  role: UserRole;
};

async function profileEmail(profile: ProfileLookup | null): Promise<string | null> {
  if (!profile || !profile.active) return null;
  if (profile.email) return profile.email.toLowerCase();

  const admin = createAdminClient();
  const { data } = await admin.auth.admin.getUserById(profile.user_id);
  return data.user?.email?.toLowerCase() || null;
}

async function resolveParticipantEmail(registrationNo: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data: matches, error } = await admin
    .from("participants")
    .select("profile_id")
    .eq("registration_no", registrationNo)
    .limit(2);

  if (error || !matches || matches.length !== 1) return null;

  const { data: profile } = await admin
    .from("profiles")
    .select("email,user_id,active,role")
    .eq("id", matches[0].profile_id)
    .eq("role", "participant")
    .maybeSingle();

  return profileEmail(profile as ProfileLookup | null);
}

async function resolveAssessorEmail(nip: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data: matches, error } = await admin
    .from("assessors")
    .select("profile_id")
    .eq("nip", nip)
    .eq("active", true)
    .limit(2);

  if (error || !matches || matches.length !== 1) return null;

  const { data: profile } = await admin
    .from("profiles")
    .select("email,user_id,active,role")
    .eq("id", matches[0].profile_id)
    .eq("role", "assessor")
    .maybeSingle();

  return profileEmail(profile as ProfileLookup | null);
}

async function resolveProdiEmail(programId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data: matches, error } = await admin
    .from("profiles")
    .select("email,user_id,active,role")
    .eq("program_id", programId)
    .eq("role", "prodi")
    .eq("active", true)
    .limit(2);

  if (error || !matches || matches.length !== 1) return null;
  return profileEmail(matches[0] as ProfileLookup);
}

function invalidCredentials(role: LoginRole) {
  if (role === "participant") return "Nomor pendaftaran atau password tidak sesuai.";
  if (role === "assessor") return "NIP atau password tidak sesuai.";
  if (role === "admin") return "Email admin atau password tidak sesuai.";
  return "Program studi atau password tidak sesuai.";
}

export async function loginAction(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const role = String(formData.get("role") || "participant") as LoginRole;
  const identifier = String(formData.get("identifier") || "").trim();
  const programId = String(formData.get("programId") || "").trim();
  const password = String(formData.get("password") || "");

  if (!password) return { error: "Password wajib diisi." };
  if (role === "participant" && !identifier) return { error: "Nomor pendaftaran wajib diisi." };
  if (role === "assessor" && !identifier) return { error: "NIP wajib diisi." };
  if (role === "prodi" && !programId) return { error: "Program studi wajib dipilih." };
  if (role === "admin" && !identifier) return { error: "Email admin wajib diisi." };

  let email: string | null = null;
  if (role === "participant") email = await resolveParticipantEmail(identifier);
  if (role === "assessor") email = await resolveAssessorEmail(identifier);
  if (role === "prodi") email = await resolveProdiEmail(programId);
  if (role === "admin") email = identifier.toLowerCase();
  if (!email) return { error: invalidCredentials(role) };

  const supabase = await createClient();
  const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !authData.user) return { error: invalidCredentials(role) };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role,active,program_id")
    .eq("user_id", authData.user.id)
    .single();

  if (!profile || !profile.active) {
    await supabase.auth.signOut();
    return { error: "Akun SuKaRPL tidak aktif atau belum memiliki profil." };
  }

  if (profile.role !== role) {
    await supabase.auth.signOut();
    return { error: "Jenis akun tidak sesuai dengan tab login yang dipilih." };
  }

  if (role === "prodi" && profile.program_id !== programId) {
    await supabase.auth.signOut();
    return { error: "Akun Prodi tidak sesuai dengan program studi yang dipilih." };
  }

  redirect(roleHome(profile.role as UserRole));
}
