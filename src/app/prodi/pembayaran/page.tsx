import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatDateTime } from "@/lib/utils";
import { rejectPaymentAction, verifyPaymentAction } from "../actions";

export const metadata = { title: "Verifikasi Pembayaran" };

const labels: Record<string, string> = {
  SUBMITTED: "Menunggu Verifikasi",
  VERIFIED: "Terverifikasi",
  REJECTED: "Ditolak"
};

const badge: Record<string, string> = {
  SUBMITTED: "bg-blue-50 text-blue-700",
  VERIFIED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-red-50 text-red-700"
};

const methodLabels: Record<string, string> = {
  TRANSFER_BANK: "Transfer Bank",
  VIRTUAL_ACCOUNT: "Virtual Account",
  OTHER: "Lainnya"
};

export default async function ProdiPaymentPage() {
  const profile = await requireProfile(["prodi", "admin"]);
  const supabase = await createClient();
  const programId = profile.program_id!;

  const { data: applications } = await supabase
    .from("applications")
    .select("id,status,submitted_at,participant:participants(id,participant_no,registration_no,full_name)")
    .eq("program_id", programId)
    .order("updated_at", { ascending: false });

  const appIds = (applications || []).map((a) => a.id);
  const { data: payments } = appIds.length
    ? await supabase.from("payments").select("*").in("application_id", appIds).order("submitted_at", { ascending: false })
    : { data: [] as any[] };

  const paymentByApp = new Map((payments || []).map((p: any) => [p.application_id, p]));
  const rows = (applications || []).map((application: any) => ({ ...application, payment: paymentByApp.get(application.id) || null }));
  const waiting = rows.filter((r: any) => r.payment?.status === "SUBMITTED").length;
  const verified = rows.filter((r: any) => r.payment?.status === "VERIFIED").length;
  const rejected = rows.filter((r: any) => r.payment?.status === "REJECTED").length;
  const unpaid = rows.filter((r: any) => !r.payment && r.status !== "FINAL").length;

  return (
    <div className="space-y-5">
      <section>
        <div className="text-xs font-black uppercase tracking-[.12em] text-[var(--rpl-orange)]">Program Studi</div>
        <h1 className="mt-1 text-2xl sm:text-3xl font-black text-[var(--rpl-green-950)]">Verifikasi Pembayaran</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Periksa link bukti pembayaran mahasiswa sebelum pengajuan diplot ke asesor.</p>
      </section>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="rpl-card p-4"><div className="text-xs font-bold text-[var(--muted)]">Menunggu</div><div className="mt-1 text-2xl font-black text-blue-700">{waiting}</div></div>
        <div className="rpl-card p-4"><div className="text-xs font-bold text-[var(--muted)]">Terverifikasi</div><div className="mt-1 text-2xl font-black text-emerald-700">{verified}</div></div>
        <div className="rpl-card p-4"><div className="text-xs font-bold text-[var(--muted)]">Ditolak</div><div className="mt-1 text-2xl font-black text-red-700">{rejected}</div></div>
        <div className="rpl-card p-4"><div className="text-xs font-bold text-[var(--muted)]">Belum Mengirim</div><div className="mt-1 text-2xl font-black text-amber-700">{unpaid}</div></div>
      </div>

      <section className="space-y-3">
        {rows.map((row: any) => {
          const payment = row.payment;
          return (
            <article key={row.id} className="rpl-card p-4 sm:p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <div className="text-xs font-black text-[var(--rpl-green-800)]">{row.participant?.registration_no || row.participant?.participant_no || "-"}</div>
                  <h2 className="mt-1 text-lg font-black text-[var(--rpl-green-950)]">{row.participant?.full_name || "Peserta"}</h2>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="rpl-pill bg-slate-100 text-slate-700">Pengajuan {row.status}</span>
                    <span className={`rpl-pill ${payment ? badge[payment.status] || "bg-slate-100 text-slate-700" : "bg-amber-50 text-amber-700"}`}>{payment ? labels[payment.status] || payment.status : "Belum Mengirim Bukti"}</span>
                  </div>
                </div>
                <Link href={`/prodi/peserta/${row.id}`} className="rpl-btn rpl-btn-secondary text-xs"><i className="bi bi-person-lines-fill" /> Detail Peserta</Link>
              </div>

              {!payment ? (
                <div className="mt-4 rounded-xl border border-dashed border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><i className="bi bi-hourglass-split mr-2" />Mahasiswa belum mengirim bukti pembayaran.</div>
              ) : (
                <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_auto] xl:items-start">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div><div className="text-[10px] font-black uppercase text-[var(--muted)]">Tanggal Bayar</div><div className="mt-1 text-sm font-bold">{formatDate(payment.payment_date)}</div></div>
                    <div><div className="text-[10px] font-black uppercase text-[var(--muted)]">Metode</div><div className="mt-1 text-sm font-bold">{methodLabels[payment.payment_method] || payment.payment_method}</div></div>
                    <div><div className="text-[10px] font-black uppercase text-[var(--muted)]">Pengirim</div><div className="mt-1 text-sm font-bold">{payment.payer_name}</div></div>
                    <div><div className="text-[10px] font-black uppercase text-[var(--muted)]">Dikirim</div><div className="mt-1 text-sm font-bold">{formatDateTime(payment.submitted_at)}</div></div>
                  </div>
                  <a href={payment.proof_url} target="_blank" rel="noopener noreferrer" className="rpl-btn rpl-btn-secondary text-xs"><i className="bi bi-box-arrow-up-right" /> Buka Bukti Bayar</a>
                </div>
              )}

              {payment?.student_note && <div className="mt-3 rounded-xl bg-[#f7faf9] p-3 text-sm"><strong>Catatan mahasiswa:</strong> {payment.student_note}</div>}
              {payment?.verification_note && payment.status === "REJECTED" && <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800"><strong>Catatan penolakan:</strong> {payment.verification_note}</div>}

              {payment?.status === "SUBMITTED" && (
                <div className="mt-4 grid gap-3 border-t border-[var(--line)] pt-4 lg:grid-cols-[auto_1fr] lg:items-end">
                  <form action={verifyPaymentAction.bind(null, payment.id)}>
                    <button type="submit" className="rpl-btn rpl-btn-primary w-full lg:w-auto"><i className="bi bi-check-circle" /> Verifikasi Pembayaran</button>
                  </form>
                  <form action={rejectPaymentAction.bind(null, payment.id)} className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
                    <div><label className="rpl-label" htmlFor={`reject-${payment.id}`}>Catatan jika ditolak</label><input id={`reject-${payment.id}`} name="verificationNote" className="rpl-input" required maxLength={1000} placeholder="Contoh: link tidak dapat diakses" /></div>
                    <button type="submit" className="rpl-btn rpl-btn-danger"><i className="bi bi-x-circle" /> Tolak</button>
                  </form>
                </div>
              )}
            </article>
          );
        })}
        {!rows.length && <div className="rpl-card p-8 text-center text-sm text-[var(--muted)]">Belum ada pengajuan RPL pada program studi ini.</div>}
      </section>
    </div>
  );
}
