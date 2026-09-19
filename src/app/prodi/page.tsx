import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { StatCard } from "@/components/stat-card";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Dashboard Prodi" };

export default async function ProdiDashboard() {
  const profile = await requireProfile("prodi");
  const supabase = await createClient();
  const programId = profile.program_id!;

  const { data: applications } = await supabase.from("applications").select("id,status,submitted_at,finalized_at,participant:participants(id,participant_no,full_name,email)").eq("program_id", programId).order("updated_at", { ascending: false });
  const appIds = (applications || []).map((a) => a.id);
  let claims: any[] = [], evidences: any[] = [], assignments: any[] = [], payments: any[] = [];
  if (appIds.length) {
    const [c, e, a, p] = await Promise.all([
      supabase.from("course_claims").select("application_id").in("application_id", appIds),
      supabase.from("evidences").select("application_id").in("application_id", appIds),
      supabase.from("assessor_assignments").select("application_id").in("application_id", appIds),
      supabase.from("payments").select("application_id,status").in("application_id", appIds)
    ]);
    claims = c.data || []; evidences = e.data || []; assignments = a.data || []; payments = p.data || [];
  }

  const rows = (applications || []).map((app: any) => ({
    ...app,
    claimCount: claims.filter((x) => x.application_id === app.id).length,
    evidenceCount: evidences.filter((x) => x.application_id === app.id).length,
    assigned: assignments.some((x) => x.application_id === app.id),
    paymentStatus: payments.find((x) => x.application_id === app.id)?.status || null
  }));
  const submitted = rows.filter((x) => ["SUBMITTED","ASSESSMENT","YUDISIUM"].includes(x.status)).length;
  const final = rows.filter((x) => x.status === "FINAL").length;

  return (
    <div className="space-y-5">
      <section>
        <div className="text-xs font-black uppercase tracking-[.12em] text-[var(--rpl-orange)]">Program Studi</div>
        <h1 className="mt-1 text-2xl sm:text-3xl font-black text-[var(--rpl-green-950)]">Dashboard SuKaRPL</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">{profile.program?.name}</p>
      </section>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <StatCard icon="bi-people" label="Total peserta" value={rows.length} />
        <StatCard icon="bi-send-check" label="Dalam proses" value={submitted} />
        <StatCard icon="bi-credit-card" label="Bayar terverifikasi" value={rows.filter((x) => x.paymentStatus === "VERIFIED").length} />
        <StatCard icon="bi-person-check" label="Sudah diplot" value={rows.filter((x) => x.assigned).length} />
        <StatCard icon="bi-patch-check" label="Final" value={final} />
      </div>

      <section className="rpl-card overflow-hidden">
        <div className="border-b border-[var(--line)] p-4 sm:p-5">
          <h2 className="text-lg font-black text-[var(--rpl-green-950)]">Peserta RPL</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">Pengajuan terbaru dan progres proses asesmen.</p>
        </div>

        <div className="grid gap-3 p-4 md:hidden">
          {rows.map((row: any) => (
            <Link key={row.id} href={`/prodi/peserta/${row.id}`} className="rounded-2xl border border-[var(--line)] bg-[#fbfdfc] p-4 active:bg-[#f0f8f5]">
              <div className="flex items-start justify-between gap-2"><div><div className="text-xs font-black text-[var(--rpl-green-800)]">{row.participant?.participant_no}</div><div className="mt-1 font-black">{row.participant?.full_name}</div></div><StatusBadge status={row.status} /></div>
              <div className="mt-4 grid grid-cols-4 gap-2 text-center"><div className="rounded-xl bg-white p-2"><div className="font-black">{row.claimCount}</div><div className="text-[10px] text-[var(--muted)]">MK</div></div><div className="rounded-xl bg-white p-2"><div className="font-black">{row.evidenceCount}</div><div className="text-[10px] text-[var(--muted)]">Bukti</div></div><div className="rounded-xl bg-white p-2"><div className="font-black">{row.paymentStatus === "VERIFIED" ? "✓" : row.paymentStatus === "SUBMITTED" ? "…" : row.paymentStatus === "REJECTED" ? "×" : "-"}</div><div className="text-[10px] text-[var(--muted)]">Bayar</div></div><div className="rounded-xl bg-white p-2"><div className="font-black">{row.assigned ? "2" : "-"}</div><div className="text-[10px] text-[var(--muted)]">Asesor</div></div></div>
            </Link>
          ))}
          {!rows.length && <div className="p-8 text-center text-sm text-[var(--muted)]">Belum ada peserta yang memiliki pengajuan.</div>}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead><tr className="bg-[#f3f8f6] text-left text-[11px] uppercase tracking-wide text-[var(--rpl-green-800)]"><th className="p-3">Peserta</th><th className="p-3">Status</th><th className="p-3 text-center">MK</th><th className="p-3 text-center">Bukti</th><th className="p-3">Pembayaran</th><th className="p-3">Asesor</th><th className="p-3">Dikirim</th><th className="p-3"></th></tr></thead>
            <tbody className="divide-y divide-[var(--line)]">{rows.map((row: any) => <tr key={row.id} className="hover:bg-[#fbfdfc]"><td className="p-3"><div className="font-black">{row.participant?.full_name}</div><div className="text-xs text-[var(--muted)]">{row.participant?.participant_no}</div></td><td className="p-3"><StatusBadge status={row.status} /></td><td className="p-3 text-center font-black">{row.claimCount}</td><td className="p-3 text-center font-black">{row.evidenceCount}</td><td className="p-3">{row.paymentStatus === "VERIFIED" ? <span className="font-bold text-emerald-700">Terverifikasi</span> : row.paymentStatus === "SUBMITTED" ? <span className="font-bold text-blue-700">Menunggu</span> : row.paymentStatus === "REJECTED" ? <span className="font-bold text-red-700">Ditolak</span> : <span className="font-bold text-amber-700">Belum</span>}</td><td className="p-3">{row.assigned ? <span className="text-emerald-700 font-bold"><i className="bi bi-check-circle mr-1" />Sudah</span> : <span className="text-amber-700 font-bold">Belum</span>}</td><td className="p-3 text-xs text-[var(--muted)]">{formatDateTime(row.submitted_at)}</td><td className="p-3 text-right"><Link className="rpl-btn rpl-btn-secondary text-xs" href={`/prodi/peserta/${row.id}`}>Detail <i className="bi bi-chevron-right" /></Link></td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
