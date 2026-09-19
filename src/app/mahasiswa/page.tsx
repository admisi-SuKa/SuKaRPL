import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { ParticipantPhoto } from "@/components/participant-photo";
import { StatCard } from "@/components/stat-card";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { extractLegacyPhotoUrl } from "@/lib/participant-photo";
import { createApplicationAction } from "./actions";

export const metadata = { title: "Beranda Mahasiswa" };

export default async function ParticipantDashboard() {
  const profile = await requireProfile("participant");
  const supabase = await createClient();
  const { data: participant } = await supabase.from("participants").select("*").eq("profile_id", profile.id).single();
  const { data: application } = participant ? await supabase.from("applications").select("*").eq("participant_id", participant.id).maybeSingle() : { data: null };

  let claimCount = 0, evidenceCount = 0, coveredCount = 0;
  let payment: { status: string } | null = null;
  if (application) {
    const { data: claims } = await supabase.from("course_claims").select("id").eq("application_id", application.id);
    const { data: evidences } = await supabase.from("evidences").select("id").eq("application_id", application.id);
    claimCount = claims?.length || 0;
    evidenceCount = evidences?.length || 0;
    const { data: paymentRow } = await supabase.from("payments").select("status").eq("application_id", application.id).maybeSingle();
    payment = paymentRow;
    if (claims?.length) {
      const { data: links } = await supabase.from("claim_evidences").select("course_claim_id").in("course_claim_id", claims.map((c) => c.id));
      coveredCount = new Set((links || []).map((x) => x.course_claim_id)).size;
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-gradient-to-br from-[var(--rpl-green-900)] to-[var(--rpl-green-700)] p-5 sm:p-7 text-white overflow-hidden relative">
        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/5" />
        <div className="relative flex items-center gap-4 sm:gap-5">
          <ParticipantPhoto registrationNo={participant?.registration_no} directUrl={extractLegacyPhotoUrl(participant?.legacy_payload)} name={participant?.full_name || profile.full_name} className="h-20 w-20 border-white/25 bg-white/10 sm:h-24 sm:w-24" iconClassName="text-4xl text-white" />
          <div className="min-w-0">
            <div className="text-xs font-black uppercase tracking-[.12em] text-emerald-100">Mahasiswa RPL</div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-black">Halo, {participant?.full_name || profile.full_name}</h1>
            <p className="mt-2 text-sm text-white/75">{participant?.participant_no || "-"} • {profile.program?.name || "Program Studi"}</p>
            {application && <div className="mt-4"><StatusBadge status={application.status} /></div>}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard icon="bi-journal-check" label="MK diajukan" value={claimCount} />
        <StatCard icon="bi-link-45deg" label="Bukti RPL" value={evidenceCount} />
        <StatCard icon="bi-check2-circle" label="MK dengan bukti" value={`${coveredCount}/${claimCount}`} />
        <StatCard icon="bi-credit-card" label="Pembayaran" value={payment?.status === "VERIFIED" ? "Terverifikasi" : payment?.status === "SUBMITTED" ? "Menunggu" : payment?.status === "REJECTED" ? "Ditolak" : "Belum"} />
        <StatCard icon="bi-calendar3" label="Pengajuan" value={application?.submitted_at ? formatDate(application.submitted_at) : "Belum"} />
      </div>

      {application?.status === "RETURNED" && application.return_note && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="font-black"><i className="bi bi-arrow-counterclockwise mr-2" />Pengajuan dikembalikan untuk revisi</div>
          <p className="mt-2 leading-6">{application.return_note}</p>
        </div>
      )}

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rpl-card p-5">
          <div className="flex h-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black text-[var(--rpl-green-950)]">Pengajuan Rekognisi</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">Pilih mata kuliah, checklist CPMK, lalu hubungkan bukti berbentuk link.</p>
            </div>
            {application ? (
              <Link className="rpl-btn rpl-btn-primary" href="/mahasiswa/pengajuan"><i className="bi bi-pencil-square" /> {application.status === "DRAFT" || application.status === "RETURNED" ? "Lanjutkan" : "Lihat"}</Link>
            ) : (
              <form action={createApplicationAction}><button className="rpl-btn rpl-btn-primary" type="submit"><i className="bi bi-plus-circle" /> Mulai</button></form>
            )}
          </div>
        </div>
        <div className="rpl-card p-5">
          <div className="flex h-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="text-lg font-black text-[var(--rpl-green-950)]">Pembayaran RPL</h2><p className="mt-1 text-sm text-[var(--muted)]">Kirim bukti pembayaran dalam bentuk link untuk diverifikasi Prodi.</p></div>
            <Link className="rpl-btn rpl-btn-secondary" href="/mahasiswa/pembayaran"><i className="bi bi-credit-card" /> Form Pembayaran</Link>
          </div>
        </div>
      </section>

      <section className="rpl-card p-5">
        <h2 className="text-lg font-black text-[var(--rpl-green-950)]">Data Diri</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[
            ["Nomor Peserta", participant?.participant_no],
            ["Nomor Pendaftaran", participant?.registration_no],
            ["Email", participant?.email],
            ["No. HP", participant?.phone],
            ["Tempat/Tanggal Lahir", [participant?.birth_place, participant?.birth_date ? formatDate(participant.birth_date) : ""].filter(Boolean).join(", ")],
            ["Pendidikan Terakhir", participant?.education_level],
            ["Perguruan Tinggi Asal", participant?.previous_institution],
            ["Program Studi Asal", participant?.previous_program],
            ["Tahun Lulus", participant?.graduation_year]
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-xl border border-[var(--line)] bg-[#fbfdfc] p-3">
              <div className="text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">{label}</div>
              <div className="mt-1 text-sm font-bold break-words">{value || "-"}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
