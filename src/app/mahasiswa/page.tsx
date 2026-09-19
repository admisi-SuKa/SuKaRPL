import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { StatCard } from "@/components/stat-card";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { createApplicationAction } from "./actions";

export const metadata = { title: "Beranda Mahasiswa" };

export default async function ParticipantDashboard() {
  const profile = await requireProfile("participant");
  const supabase = await createClient();
  const { data: participant } = await supabase.from("participants").select("*").eq("profile_id", profile.id).single();
  const { data: application } = participant ? await supabase.from("applications").select("*").eq("participant_id", participant.id).maybeSingle() : { data: null };

  let claimCount = 0, evidenceCount = 0, coveredCount = 0;
  if (application) {
    const { data: claims } = await supabase.from("course_claims").select("id").eq("application_id", application.id);
    const { data: evidences } = await supabase.from("evidences").select("id").eq("application_id", application.id);
    claimCount = claims?.length || 0;
    evidenceCount = evidences?.length || 0;
    if (claims?.length) {
      const { data: links } = await supabase.from("claim_evidences").select("course_claim_id").in("course_claim_id", claims.map((c) => c.id));
      coveredCount = new Set((links || []).map((x) => x.course_claim_id)).size;
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-gradient-to-br from-[var(--rpl-green-900)] to-[var(--rpl-green-700)] p-5 sm:p-7 text-white overflow-hidden relative">
        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/5" />
        <div className="relative">
          <div className="text-xs font-black uppercase tracking-[.12em] text-emerald-100">Mahasiswa RPL</div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-black">Halo, {participant?.full_name || profile.full_name}</h1>
          <p className="mt-2 text-sm text-white/75">{participant?.participant_no || "-"} • {profile.program?.name || "Program Studi"}</p>
          {application && <div className="mt-4"><StatusBadge status={application.status} /></div>}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon="bi-journal-check" label="MK diajukan" value={claimCount} />
        <StatCard icon="bi-link-45deg" label="Bukti" value={evidenceCount} />
        <StatCard icon="bi-check2-circle" label="MK dengan bukti" value={`${coveredCount}/${claimCount}`} />
        <StatCard icon="bi-calendar3" label="Pengajuan" value={application?.submitted_at ? formatDate(application.submitted_at) : "Belum"} />
      </div>

      {application?.status === "RETURNED" && application.return_note && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="font-black"><i className="bi bi-arrow-counterclockwise mr-2" />Pengajuan dikembalikan untuk revisi</div>
          <p className="mt-2 leading-6">{application.return_note}</p>
        </div>
      )}

      <section className="rpl-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black text-[var(--rpl-green-950)]">Pengajuan Rekognisi</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Pilih mata kuliah dan hubungkan setiap mata kuliah dengan bukti berbentuk link.</p>
          </div>
          {application ? (
            <Link className="rpl-btn rpl-btn-primary" href="/mahasiswa/pengajuan"><i className="bi bi-pencil-square" /> {application.status === "DRAFT" || application.status === "RETURNED" ? "Lanjutkan Pengajuan" : "Lihat Pengajuan"}</Link>
          ) : (
            <form action={createApplicationAction}><button className="rpl-btn rpl-btn-primary" type="submit"><i className="bi bi-plus-circle" /> Mulai Pengajuan</button></form>
          )}
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
