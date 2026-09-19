import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { CurrentProfile, UserRole } from "@/lib/types";

export const getCurrentProfile = cache(async (): Promise<CurrentProfile | null> => {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id,user_id,role,full_name,email,program_id,program:programs(id,code,name)")
    .eq("user_id", userId)
    .single();

  if (error || !data) return null;
  return data as unknown as CurrentProfile;
});

export async function requireProfile(roles?: UserRole | UserRole[]) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (roles) {
    const allowed = Array.isArray(roles) ? roles : [roles];
    if (!allowed.includes(profile.role)) redirect(roleHome(profile.role));
  }
  return profile;
}

export function roleHome(role: UserRole) {
  if (role === "participant") return "/mahasiswa";
  if (role === "prodi") return "/prodi";
  if (role === "admin") return "/admin";
  if (role === "assessor") return "/asesor";
  return "/login";
}
