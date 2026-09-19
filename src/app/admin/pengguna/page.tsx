import { requireProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { UserManager } from "./user-manager";

export const metadata = { title: "Pengguna" };
export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  await requireProfile("admin");
  const admin = createAdminClient();
  const [{ data: profiles }, { data: participants }, { data: assessors }] = await Promise.all([
    admin.from("profiles").select("id,user_id,role,full_name,email,active,program:programs(name)").order("full_name"),
    admin.from("participants").select("profile_id,registration_no,participant_no"),
    admin.from("assessors").select("profile_id,nip")
  ]);
  const pMap = new Map((participants || []).map((p: any) => [p.profile_id, p.registration_no || p.participant_no]));
  const aMap = new Map((assessors || []).map((a: any) => [a.profile_id, a.nip]));
  const users = (profiles || []).map((row: any) => ({ ...row, identifier: row.role === "participant" ? pMap.get(row.id) : row.role === "assessor" ? aMap.get(row.id) : null }));

  return <div className="space-y-5"><section><div className="text-xs font-black uppercase tracking-[.12em] text-[var(--rpl-orange)]">Administrator</div><h1 className="mt-1 text-2xl font-black text-[var(--rpl-green-950)]">Semua Pengguna</h1><p className="mt-2 text-sm text-[var(--muted)]">Edit nama, email internal, status akun, dan reset password untuk Mahasiswa, Asesor, Prodi, maupun Admin.</p></section><UserManager users={users as any[]} /></div>;
}
