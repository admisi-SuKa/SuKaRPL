import Link from "next/link";
import { StatCard } from "@/components/stat-card";
import { requireProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Dashboard Admin" };
export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  await requireProfile("admin");
  const admin = createAdminClient();
  const [participants, prodi, programs, apps, payments] = await Promise.all([
    admin.from("participants").select("id,profile:profiles(active)", { count: "exact" }),
    admin.from("profiles").select("id,active", { count: "exact" }).eq("role", "prodi"),
    admin.from("programs").select("id", { count: "exact" }).eq("active", true),
    admin.from("applications").select("id,status", { count: "exact" }),
    admin.from("payments").select("id,status", { count: "exact" })
  ]);
  const participantRows = participants.data || [];
  const appRows = apps.data || [];
  const paymentRows = payments.data || [];

  return (
    <div className="space-y-5">
      <section>
        <div className="text-xs font-black uppercase tracking-[.12em] text-[var(--rpl-orange)]">Administrator</div>
        <h1 className="mt-1 text-2xl sm:text-3xl font-black text-[var(--rpl-green-950)]">Dashboard SuKaRPL</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">Kelola akun dan data administratif tanpa mengambil alih kewenangan akademik Prodi maupun Asesor.</p>
      </section>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <StatCard icon="bi-people" label="Calon mahasiswa" value={participantRows.length} />
        <StatCard icon="bi-person-check" label="Mahasiswa aktif" value={participantRows.filter((x: any) => x.profile?.active).length} />
        <StatCard icon="bi-building" label="Program aktif" value={programs.count || 0} />
        <StatCard icon="bi-person-gear" label="Akun Prodi" value={prodi.count || 0} />
        <StatCard icon="bi-file-earmark-check" label="Pengajuan final" value={appRows.filter((x: any) => x.status === "FINAL").length} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Link href="/admin/mahasiswa" className="rpl-card p-5 transition hover:-translate-y-0.5 hover:shadow-md"><div className="text-2xl text-[var(--rpl-green-800)]"><i className="bi bi-person-plus" /></div><h2 className="mt-3 font-black">Kelola Calon Mahasiswa</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Tambah, edit, aktif/nonaktifkan, dan reset password mahasiswa.</p></Link>
        <Link href="/admin/pengguna" className="rpl-card p-5 transition hover:-translate-y-0.5 hover:shadow-md"><div className="text-2xl text-[var(--rpl-orange)]"><i className="bi bi-people-fill" /></div><h2 className="mt-3 font-black">Semua Pengguna</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Kelola Mahasiswa, Asesor, Prodi, dan Administrator pada satu tabel.</p></Link>
        <Link href="/admin/audit" className="rpl-card p-5 transition hover:-translate-y-0.5 hover:shadow-md"><div className="text-2xl text-[var(--rpl-green-800)]"><i className="bi bi-clock-history" /></div><h2 className="mt-3 font-black">Audit Aktivitas</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Lihat jejak perubahan administratif yang dilakukan pengguna sistem.</p></Link>
      </div>

      <section className="rpl-card p-5">
        <h2 className="font-black text-[var(--rpl-green-950)]">Ringkasan Operasional</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-[#f3f8f6] p-4"><div className="text-xs font-bold text-[var(--muted)]">Pengajuan dalam proses</div><div className="mt-1 text-2xl font-black">{appRows.filter((x: any) => ["SUBMITTED","RETURNED","ASSESSMENT","YUDISIUM"].includes(x.status)).length}</div></div>
          <div className="rounded-xl bg-[#fff7ed] p-4"><div className="text-xs font-bold text-[var(--muted)]">Pembayaran menunggu</div><div className="mt-1 text-2xl font-black">{paymentRows.filter((x: any) => x.status === "SUBMITTED").length}</div></div>
          <div className="rounded-xl bg-[#ecfdf5] p-4"><div className="text-xs font-bold text-[var(--muted)]">Pembayaran terverifikasi</div><div className="mt-1 text-2xl font-black">{paymentRows.filter((x: any) => x.status === "VERIFIED").length}</div></div>
        </div>
      </section>
    </div>
  );
}
