import { requireProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ProdiAccountCard } from "./prodi-account-card";
import { setProdiActiveAction } from "../actions";

export const metadata = { title: "Akun Prodi" };
export const dynamic = "force-dynamic";

export default async function AdminProdiPage() {
  await requireProfile("admin");
  const admin = createAdminClient();
  const { data: accounts } = await admin
    .from("profiles")
    .select("id,full_name,email,active,program_id,program:programs(name)")
    .eq("role", "prodi")
    .order("full_name");

  return (
    <div className="space-y-5">
      <section><div className="text-xs font-black uppercase tracking-[.12em] text-[var(--rpl-orange)]">Administrator</div><h1 className="mt-1 text-2xl font-black text-[var(--rpl-green-950)]">Akun Program Studi</h1><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Admin dapat reset password dan mengaktifkan/nonaktifkan akun Prodi. Password lama tidak pernah ditampilkan.</p></section>
      <div className="grid gap-4 xl:grid-cols-2">
        {(accounts || []).map((account: any) => (
          <div key={account.id} className="space-y-2">
            <ProdiAccountCard account={account} />
            <form action={setProdiActiveAction} className="flex justify-end">
              <input type="hidden" name="profileId" value={account.id} />
              <input type="hidden" name="active" value={account.active ? "false" : "true"} />
              <button className={account.active ? "rpl-btn rpl-btn-danger text-xs" : "rpl-btn rpl-btn-primary text-xs"}><i className={`bi ${account.active ? "bi-person-x" : "bi-person-check"}`} />{account.active ? "Nonaktifkan Akun Prodi" : "Aktifkan Akun Prodi"}</button>
            </form>
          </div>
        ))}
      </div>
      {!accounts?.length && <div className="rpl-card p-8 text-center text-sm text-[var(--muted)]">Belum ada akun Prodi.</div>}
    </div>
  );
}
