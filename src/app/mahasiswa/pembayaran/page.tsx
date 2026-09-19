import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils";
import { PaymentForm } from "./payment-form";

export const metadata = { title: "Pembayaran RPL" };

const paymentLabels: Record<string, string> = {
  SUBMITTED: "Menunggu Verifikasi",
  VERIFIED: "Terverifikasi",
  REJECTED: "Ditolak"
};

const paymentClasses: Record<string, string> = {
  SUBMITTED: "border-blue-200 bg-blue-50 text-blue-800",
  VERIFIED: "border-emerald-200 bg-emerald-50 text-emerald-800",
  REJECTED: "border-red-200 bg-red-50 text-red-800"
};

export default async function ParticipantPaymentPage() {
  const profile = await requireProfile("participant");
  const supabase = await createClient();
  const { data: participant } = await supabase.from("participants").select("id,registration_no,participant_no,full_name").eq("profile_id", profile.id).maybeSingle();
  const { data: application } = participant ? await supabase.from("applications").select("id,status").eq("participant_id", participant.id).maybeSingle() : { data: null };
  const { data: payment } = application ? await supabase.from("payments").select("*").eq("application_id", application.id).maybeSingle() : { data: null };

  if (!application) {
    return (
      <div className="space-y-5">
        <section><div className="text-xs font-black uppercase tracking-[.12em] text-[var(--rpl-orange)]">Mahasiswa</div><h1 className="mt-1 text-2xl font-black text-[var(--rpl-green-950)]">Pembayaran RPL</h1></section>
        <section className="rpl-card p-6 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-50 text-2xl text-amber-700"><i className="bi bi-journal-plus" /></div><h2 className="mt-4 text-lg font-black">Belum ada pengajuan RPL</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[var(--muted)]">Buat pengajuan RPL terlebih dahulu. Setelah itu formulir bukti pembayaran dapat digunakan.</p><Link href="/mahasiswa" className="rpl-btn rpl-btn-primary mt-4"><i className="bi bi-arrow-left" /> Ke Beranda</Link></section>
      </div>
    );
  }

  const locked = payment?.status === "SUBMITTED" || payment?.status === "VERIFIED" || application.status === "FINAL";

  return (
    <div className="space-y-5">
      <section>
        <div className="text-xs font-black uppercase tracking-[.12em] text-[var(--rpl-orange)]">Mahasiswa</div>
        <h1 className="mt-1 text-2xl sm:text-3xl font-black text-[var(--rpl-green-950)]">Pembayaran RPL</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Kirim bukti pembayaran dalam bentuk link. Tidak ada upload file pada SuKaRPL.</p>
      </section>

      <section className="rpl-card p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--line)] bg-[#fbfdfc] p-3"><div className="text-[10px] font-black uppercase tracking-wide text-[var(--muted)]">Nomor Pendaftaran</div><div className="mt-1 font-black">{participant?.registration_no || "-"}</div></div>
          <div className="rounded-xl border border-[var(--line)] bg-[#fbfdfc] p-3"><div className="text-[10px] font-black uppercase tracking-wide text-[var(--muted)]">Nama</div><div className="mt-1 font-black">{participant?.full_name || profile.full_name}</div></div>
          <div className="rounded-xl border border-[var(--line)] bg-[#fbfdfc] p-3"><div className="text-[10px] font-black uppercase tracking-wide text-[var(--muted)]">Program Studi</div><div className="mt-1 font-black">{profile.program?.name || "-"}</div></div>
        </div>
      </section>

      {payment && (
        <section className={`rounded-2xl border p-5 ${paymentClasses[payment.status] || "border-slate-200 bg-slate-50 text-slate-800"}`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div><div className="text-xs font-black uppercase tracking-wide">Status Pembayaran</div><div className="mt-1 text-lg font-black">{paymentLabels[payment.status] || payment.status}</div><div className="mt-1 text-xs opacity-75">Dikirim {formatDateTime(payment.submitted_at)}</div></div>
            {payment.proof_url && <a href={payment.proof_url} target="_blank" rel="noopener noreferrer" className="rpl-btn rpl-btn-secondary text-xs"><i className="bi bi-box-arrow-up-right" /> Buka Bukti</a>}
          </div>
          {payment.status === "REJECTED" && payment.verification_note && <div className="mt-4 rounded-xl bg-white/70 p-3 text-sm"><strong>Catatan Prodi:</strong> {payment.verification_note}</div>}
          {payment.status === "VERIFIED" && <p className="mt-3 text-sm font-bold"><i className="bi bi-check-circle-fill mr-1" /> Pembayaran sudah terverifikasi. Pengajuan dapat diproses ke tahap asesmen.</p>}
          {payment.status === "SUBMITTED" && <p className="mt-3 text-sm">Bukti pembayaran sedang menunggu pemeriksaan Prodi.</p>}
        </section>
      )}

      {!locked && (
        <section className="rpl-card p-5">
          <div className="mb-5"><h2 className="text-lg font-black text-[var(--rpl-green-950)]">{payment?.status === "REJECTED" ? "Perbaiki Bukti Pembayaran" : "Form Bukti Pembayaran"}</h2><p className="mt-1 text-xs text-[var(--muted)]">Semua kolom selain catatan wajib diisi. Tidak perlu memasukkan nominal pembayaran.</p></div>
          <PaymentForm payment={payment as any} />
        </section>
      )}

      {application.status === "FINAL" && !payment && <section className="rpl-card p-5 text-sm text-[var(--muted)]"><i className="bi bi-lock mr-2" />Pengajuan ini sudah final sehingga formulir pembayaran tidak lagi dapat diubah.</section>}
    </div>
  );
}
