import { requireProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractLegacyPhotoUrl } from "@/lib/participant-photo";
import { UserManager } from "./user-manager";

export const metadata = { title: "Pengguna" };
export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  await requireProfile("admin");
  const admin = createAdminClient();
  const [{ data: profiles }, { data: participants }, { data: assessors }] = await Promise.all([
    admin.from("profiles").select("id,user_id,role,full_name,email,active,program:programs(name)").order("full_name"),
    admin.from("participants").select("profile_id,registration_no,participant_no,legacy_payload"),
    admin.from("assessors").select("profile_id,nip")
  ]);

  const pMap = new Map<string, { identifier: string | null; registrationNo: string | null; photoUrl: string | null }>((participants || []).map((p: any) => [p.profile_id, {
    identifier: p.registration_no || p.participant_no || null,
    registrationNo: p.registration_no || null,
    photoUrl: extractLegacyPhotoUrl(p.legacy_payload)
  }]));
  const aMap = new Map((assessors || []).map((a: any) => [a.profile_id, a.nip]));
  const users = (profiles || []).map((row: any) => {
    const participant = pMap.get(row.id);
    return {
      ...row,
      identifier: row.role === "participant" ? participant?.identifier : row.role === "assessor" ? aMap.get(row.id) : null,
      registrationNo: row.role === "participant" ? participant?.registrationNo : null,
      photoUrl: row.role === "participant" ? participant?.photoUrl : null
    };
  });

  return (
    <div className="space-y-5">
      <section>
        <div className="text-xs font-black uppercase tracking-[.12em] text-[var(--rpl-orange)]">Administrator</div>
        <h1 className="mt-1 text-2xl font-black text-[var(--rpl-green-950)]">Semua Pengguna</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Mahasiswa, Asesor, Prodi, dan Administrator dikelola pada satu tabel. Klik Edit untuk mengubah nama, email, status akun, dan password.</p>
      </section>
      <UserManager users={users as any[]} />
    </div>
  );
}
