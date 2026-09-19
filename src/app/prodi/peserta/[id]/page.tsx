import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import { ParticipantPhoto } from "@/components/participant-photo";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils";
import { extractLegacyPhotoUrl } from "@/lib/participant-photo";
import { ParticipantControls } from "./participant-controls";

export default async function ProdiParticipantDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile("prodi");
  const supabase = await createClient();

  const { data: application } = await supabase
    .from("applications")
    .select("*,participant:participants(*)")
    .eq("id", id)
    .eq("program_id", profile.program_id!)
    .maybeSingle();
  if (!application) notFound();

  const [{ data: claims }, { data: assignment }, { data: assessors }, { data: payment }] = await Promise.all([
    supabase.from("course_claims").select("id,course_id,course:courses(code,name,credits,assessment_type)").eq("application_id", id),
    supabase.from("assessor_assignments").select("assessor1_id,assessor2_id,assessor1:assessors!assessor_assignments_assessor1_id_fkey(full_name,nip),assessor2:assessors!assessor_assignments_assessor2_id_fkey(full_name,nip)").eq("application_id", id).maybeSingle(),
    supabase.from("assessors").select("id,full_name,nip").eq("program_id", profile.program_id!).eq("active", true).order("full_name"),
    supabase.from("payments").select("id,status,payment_date,payment_method,payer_name,proof_url,student_note,verification_note,submitted_at").eq("application_id", id).maybeSingle()
  ]);

  const claimIds = (claims || []).map((claim) => claim.id);
  let selectedCpmks: any[] = [];
  let supportingEvidences: any[] = [];
  if (claimIds.length) {
    const [cp, evidence] = await Promise.all([
      supabase.from("course_claim_cpmks").select("course_claim_id,cpmk:cpmks(id,code,description,sort_order)").in("course_claim_id", claimIds),
      supabase.from("supporting_evidences").select("id,course_claim_id,cpmk_id,url,description").in("course_claim_id", claimIds).order("created_at")
    ]);
    selectedCpmks = cp.data || [];
    supportingEvidences = evidence.data || [];
  }

  const participant: any = application.participant;

  return (
    <div className="space-y-5">
      <section className="rpl-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <ParticipantPhoto registrationNo={participant?.registration_no} directUrl={extractLegacyPhotoUrl(participant?.legacy_payload)} name={participant?.full_name} className="h-16 w-16 sm:h-20 sm:w-20" iconClassName="text-3xl" />
            <div><div className="text-xs font-black text-[var(--rpl-green-800)]">{participant?.participant_no}</div><h1 className="mt-1 text-2xl font-black text-[var(--rpl-green-950)]">{participant?.full_name}</h1><p className="mt-1 text-sm text-[var(--muted)]">{participant?.email || "-"} • Dikirim {formatDateTime(application.submitted_at)}</p></div>
          </div>
          <StatusBadge status={application.status} />
        </div>
        {application.return_note && application.status === "RETURNED" && <div className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900"><strong>Catatan revisi:</strong> {application.return_note}</div>}
      </section>

      <section className="rpl-card p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div><h2 className="font-black text-[var(--rpl-green-950)]">Pembayaran</h2><p className="mt-1 text-xs text-[var(--muted)]">Bukti pembayaran mahasiswa dalam bentuk link.</p></div>
          <span className={`rpl-pill ${payment?.status === "VERIFIED" ? "bg-emerald-50 text-emerald-700" : payment?.status === "SUBMITTED" ? "bg-blue-50 text-blue-700" : payment?.status === "REJECTED" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>{payment?.status === "VERIFIED" ? "Terverifikasi" : payment?.status === "SUBMITTED" ? "Menunggu Verifikasi" : payment?.status === "REJECTED" ? "Ditolak" : "Belum Mengirim"}</span>
        </div>
        {payment ? <div className="mt-4 grid gap-3 sm:grid-cols-3"><div><div className="text-[10px] font-black uppercase text-[var(--muted)]">Tanggal Bayar</div><div className="mt-1 text-sm font-bold">{payment.payment_date || "-"}</div></div><div><div className="text-[10px] font-black uppercase text-[var(--muted)]">Pengirim</div><div className="mt-1 text-sm font-bold">{payment.payer_name || "-"}</div></div><div><a className="rpl-btn rpl-btn-secondary text-xs" href={payment.proof_url} target="_blank" rel="noopener noreferrer"><i className="bi bi-box-arrow-up-right" /> Buka Bukti Bayar</a></div></div> : <div className="mt-4 text-sm text-[var(--muted)]">Mahasiswa belum mengirim bukti pembayaran.</div>}
        {payment?.verification_note && <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800"><strong>Catatan:</strong> {payment.verification_note}</div>}
      </section>

      <ParticipantControls applicationId={id} status={application.status} paymentStatus={payment?.status || null} assessors={(assessors || []) as any[]} assignment={assignment ? { assessor1_id: assignment.assessor1_id, assessor2_id: assignment.assessor2_id } : null} />

      <section className="rpl-card overflow-hidden">
        <div className="border-b border-[var(--line)] p-5"><h2 className="text-lg font-black text-[var(--rpl-green-950)]">Mata Kuliah, CPMK, dan Bukti Dukung</h2><p className="mt-1 text-xs text-[var(--muted)]">Bukti ditampilkan sesuai CPMK yang diajukan peserta.</p></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] border-collapse text-sm">
            <thead><tr className="bg-[#f3f8f6] text-left text-[11px] uppercase tracking-wide text-[var(--rpl-green-800)]"><th className="p-3">Mata Kuliah</th><th className="p-3">CPMK</th><th className="p-3">Bukti Dukung</th><th className="p-3">Deskripsi</th></tr></thead>
            <tbody className="divide-y divide-[var(--line)]">
              {(claims || []).flatMap((claim: any) => {
                const selected = selectedCpmks.filter((row: any) => row.course_claim_id === claim.id && row.cpmk).sort((a: any, b: any) => Number(a.cpmk.sort_order || 0) - Number(b.cpmk.sort_order || 0));
                if (claim.course?.assessment_type === "NON_OBE") {
                  const evs = supportingEvidences.filter((e: any) => e.course_claim_id === claim.id && e.cpmk_id === null);
                  return [<EvidenceReadRow key={`${claim.id}-course`} course={claim.course} cpmk={null} evidences={evs} />];
                }
                return selected.map((row: any, index: number) => {
                  const evs = supportingEvidences.filter((e: any) => e.course_claim_id === claim.id && e.cpmk_id === row.cpmk.id);
                  return <EvidenceReadRow key={`${claim.id}-${row.cpmk.id}`} course={index === 0 ? claim.course : null} cpmk={row.cpmk} evidences={evs} />;
                });
              })}
              {!claims?.length && <tr><td colSpan={4} className="p-8 text-center text-sm text-[var(--muted)]">Belum ada mata kuliah yang diajukan.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {assignment && <section className="rpl-card p-5"><h2 className="font-black text-[var(--rpl-green-950)]">Asesor Terplot</h2><div className="mt-3 grid gap-3 sm:grid-cols-2">{[assignment.assessor1, assignment.assessor2].map((assessorRow: any, index) => <div key={index} className="rounded-xl border border-[var(--line)] p-3"><div className="text-[10px] font-black uppercase text-[var(--muted)]">Asesor {index + 1}</div><div className="mt-1 font-black">{assessorRow?.full_name}</div><div className="text-xs text-[var(--muted)]">NIP {assessorRow?.nip}</div></div>)}</div></section>}
    </div>
  );
}

function EvidenceReadRow({ course, cpmk, evidences }: { course: any; cpmk: any; evidences: any[] }) {
  return (
    <tr className="align-top hover:bg-[#fbfdfc]">
      <td className="p-3">{course ? <div><div className="text-xs font-black text-[var(--rpl-green-800)]">{course.code}</div><div className="mt-1 font-bold">{course.name}</div><div className="mt-1 text-xs text-[var(--muted)]">{course.credits} SKS • {course.assessment_type}</div></div> : <span className="text-xs text-[var(--muted)]">↳</span>}</td>
      <td className="p-3">{cpmk ? <div><strong className="text-[var(--rpl-green-900)]">{cpmk.code}</strong><div className="mt-1 text-xs leading-5 text-[var(--muted)]">{cpmk.description}</div></div> : <span className="text-xs font-bold text-[var(--muted)]">Non OBE</span>}</td>
      <td className="p-3"><div className="space-y-2">{evidences.map((evidence) => <a key={evidence.id} href={evidence.url} target="_blank" rel="noopener noreferrer" className="rpl-btn rpl-btn-secondary inline-flex text-xs"><i className="bi bi-box-arrow-up-right" /> Buka Bukti</a>)}{!evidences.length && <span className="text-xs text-amber-700">Belum ada bukti.</span>}</div></td>
      <td className="p-3"><div className="space-y-2">{evidences.map((evidence) => <div key={evidence.id} className="text-xs leading-5 text-[var(--muted)]">{evidence.description || "-"}</div>)}{!evidences.length && <span className="text-xs text-[var(--muted)]">-</span>}</div></td>
    </tr>
  );
}
