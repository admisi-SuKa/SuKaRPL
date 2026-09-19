import Link from "next/link";
import { ParticipantPhoto } from "@/components/participant-photo";
import { requireProfile } from "@/lib/auth";
import { extractLegacyPhotoUrl } from "@/lib/participant-photo";
import { createAdminClient } from "@/lib/supabase/admin";
import { ParticipantCreateForm } from "./participant-create-form";
import { setParticipantActiveAction } from "../actions";

export const metadata = { title: "Calon Mahasiswa" };
export const dynamic = "force-dynamic";

export default async function AdminParticipantsPage() {
  await requireProfile("admin");
  const admin = createAdminClient();
  const [{ data: programs }, { data: participants }] = await Promise.all([
    admin.from("programs").select("id,name").eq("active", true).order("name"),
    admin.from("participants").select("id,participant_no,registration_no,full_name,email,legacy_payload,program:programs(name),profile:profiles(active)").order("created_at", { ascending: false })
  ]);

  return (
    <div className="space-y-5">
      <section><div className="text-xs font-black uppercase tracking-[.12em] text-[var(--rpl-orange)]">Administrator</div><h1 className="mt-1 text-2xl font-black text-[var(--rpl-green-950)]">Calon Mahasiswa</h1><p className="mt-2 text-sm text-[var(--muted)]">Kelola identitas dan akses akun mahasiswa. Foto dicoba dari link foto sumber, lalu nomor pendaftaran .png, kemudian .jpg. Jika tidak ditemukan, sistem menampilkan ikon orang.</p></section>

      <section className="rpl-card p-4 sm:p-5">
        <h2 className="text-lg font-black text-[var(--rpl-green-950)]">Tambah Calon Mahasiswa</h2>
        <p className="mt-1 mb-5 text-xs text-[var(--muted)]">Password sementara akan dibuat otomatis dan hanya ditampilkan setelah akun berhasil dibuat.</p>
        <ParticipantCreateForm programs={programs || []} />
      </section>

      <section className="rpl-card overflow-hidden">
        <div className="border-b border-[var(--line)] p-4 sm:p-5"><h2 className="text-lg font-black">Daftar Mahasiswa</h2><p className="mt-1 text-xs text-[var(--muted)]">{participants?.length || 0} akun terdaftar.</p></div>
        <div className="grid gap-3 p-4 md:hidden">
          {(participants || []).map((row: any) => <div key={row.id} className="rounded-2xl border border-[var(--line)] bg-[#fbfdfc] p-4"><div className="flex items-start gap-3"><ParticipantPhoto registrationNo={row.registration_no} directUrl={extractLegacyPhotoUrl(row.legacy_payload)} name={row.full_name} className="h-14 w-14" iconClassName="text-2xl" /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><div className="text-xs font-black text-[var(--rpl-green-800)]">{row.registration_no || "-"}</div><div className="mt-1 font-black">{row.full_name}</div><div className="mt-1 text-xs text-[var(--muted)]">{row.program?.name}</div></div><span className={`rpl-pill ${row.profile?.active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{row.profile?.active ? "Aktif" : "Nonaktif"}</span></div></div></div><div className="mt-4 flex flex-wrap gap-2"><Link href={`/admin/mahasiswa/${row.id}`} className="rpl-btn rpl-btn-secondary text-xs"><i className="bi bi-pencil" />Kelola</Link><form action={setParticipantActiveAction}><input type="hidden" name="id" value={row.id} /><input type="hidden" name="active" value={row.profile?.active ? "false" : "true"} /><button className={row.profile?.active ? "rpl-btn rpl-btn-danger text-xs" : "rpl-btn rpl-btn-primary text-xs"}>{row.profile?.active ? "Nonaktifkan" : "Aktifkan"}</button></form></div></div>)}
        </div>
        <div className="hidden overflow-x-auto md:block"><table className="w-full border-collapse text-sm"><thead><tr className="bg-[#f3f8f6] text-left text-[11px] uppercase tracking-wide text-[var(--rpl-green-800)]"><th className="p-3">Foto</th><th className="p-3">Mahasiswa</th><th className="p-3">No. Pendaftaran</th><th className="p-3">Program</th><th className="p-3">Status</th><th className="p-3"></th></tr></thead><tbody className="divide-y divide-[var(--line)]">{(participants || []).map((row: any) => <tr key={row.id}><td className="p-3"><ParticipantPhoto registrationNo={row.registration_no} directUrl={extractLegacyPhotoUrl(row.legacy_payload)} name={row.full_name} className="h-11 w-11" /></td><td className="p-3"><div className="font-black">{row.full_name}</div><div className="text-xs text-[var(--muted)]">{row.participant_no}</div></td><td className="p-3 font-bold">{row.registration_no || "-"}</td><td className="p-3">{row.program?.name}</td><td className="p-3"><span className={`rpl-pill ${row.profile?.active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{row.profile?.active ? "Aktif" : "Nonaktif"}</span></td><td className="p-3"><div className="flex justify-end gap-2"><Link href={`/admin/mahasiswa/${row.id}`} className="rpl-btn rpl-btn-secondary text-xs">Kelola</Link><form action={setParticipantActiveAction}><input type="hidden" name="id" value={row.id} /><input type="hidden" name="active" value={row.profile?.active ? "false" : "true"} /><button className={row.profile?.active ? "rpl-btn rpl-btn-danger text-xs" : "rpl-btn rpl-btn-primary text-xs"}>{row.profile?.active ? "Nonaktifkan" : "Aktifkan"}</button></form></div></td></tr>)}</tbody></table></div>
      </section>
    </div>
  );
}
