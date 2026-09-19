"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { roleHome } from "@/lib/auth";
import type { UserRole } from "@/lib/types";

export type LoginState = { error?: string };

export async function loginAction(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const expectedRole = String(formData.get("role") || "participant") as UserRole;

  if (!email || !password) return { error: "Email dan password wajib diisi." };

  const supabase = await createClient();
  const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !authData.user) return { error: "Email atau password tidak sesuai." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", authData.user.id)
    .single();

  if (!profile) {
    await supabase.auth.signOut();
    return { error: "Akun belum memiliki profil SuKaRPL." };
  }

  if (profile.role !== expectedRole && !(expectedRole === "prodi" && profile.role === "admin")) {
    await supabase.auth.signOut();
    return { error: "Jenis akun tidak sesuai dengan tab login yang dipilih." };
  }

  redirect(roleHome(profile.role as UserRole));
}
