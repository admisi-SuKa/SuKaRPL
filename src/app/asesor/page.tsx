import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { ParticipantPhoto } from "@/components/participant-photo";
import { StatCard } from "@/components/stat-card";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { extractLegacyPhotoUrl } from "@/lib/participant-photo";

export const metadata = { title: "Dashboard Asesor" };

export default async function AssessorDashboard() {
  const profile = await requireProfile("assessor");
  const supabase = await createClient();
  const { data: assessor } = await supabase.from("assessors").select("id,nip,full_name").eq("profile_id", profile.id).single();
  if (!assessor) return <div className="rpl-card p-6">Data asesor tidak ditemukan.</div>;
  const { data: assignments } = await supabase.from("assessor_assignments").select("application_id,assessor1_id,assessor2_id,application:applications(id,status,participant:participants(participant_no,registration_no,full_name,legacy_payload))").or(`assessor1_id.eq.${assessor.id},assessor2_id.eq.${assessor.id}`).order("updated_at", { ascending: false });
  const appIds = (assignments || []).map((a) => a.application_id);
  let claims: any[] = [], scores: any[] = [];
  if (appIds.length) {
    const [c, s] = await Promise.all([
      supabase.from("course_claims").select("application_id,id").in("application_id", appIds),
      supabase.from("assessor_scores").select("application_id,course_claim_id,score").eq("assessor_id", assessor.id).in("application_id", appIds)
    ]);
    claims = c.data || []; scores = s.data || [];
  }
  const rows = (assignments || []).map((a: any) => {
    const appClaims = claims.filter((c) => c.application_id === a.application_id);
    const scoredClaims = new Set(scores.filter((s) => s.application_id === a.application_id && s.score !== null).map((s) => s.course_claim_id)).size;
    return { ...a, claimCount: appClaims.length, scoredClaims, position: a.assessor1_id === assessor.id ? "Asesor 1" : "Asesor 2" };
  });

  return <div className="space-y-5"><section><div className="text-xs font-black uppercase tracking-[.12em] text-[var(--rpl-orange)]">Asesor RPL</div><h1 className="mt-1 text-2xl sm:text-3xl font-black text-[var(--rpl-green-950)]">Peserta Saya</h1><p className="mt-2 text-sm text-[var(--muted)]">{assessor.full_name} • NIP {assessor.nip}</p></section><div className="grid grid-cols-2 gap-3 lg:grid-cols-3"><StatCard icon="bi-people" label="Peserta terplot" value={rows.length} /><StatCard icon="bi-journal-check" label="Total MK" value={rows.reduce((s,r) => s+r.claimCount,0)} /><StatCard icon="bi-check2-circle" label="MK mulai dinilai" value={rows.reduce((s,r) => s+r.scoredClaims,0)} /></div><section className="grid gap-3 lg:grid-cols-2">{rows.map((row: any) => <Link href={`/asesor/${row.application_id}`} key={row.application_id} className="rpl-card p-4 sm:p-5 transition hover:-translate-y-0.5"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><ParticipantPhoto registrationNo={row.application?.participant?.registration_no} directUrl={extractLegacyPhotoUrl(row.application?.participant?.legacy_payload)} name={row.application?.participant?.full_name} className="h-12 w-12" /><div><div className="text-xs font-black text-[var(--rpl-green-800)]">{row.application?.participant?.participant_no}</div><div className="mt-1 text-lg font-black">{row.application?.participant?.full_name}</div><div className="mt-1 text-xs text-[var(--muted)]">{row.position}</div></div></div><StatusBadge status={row.application?.status} /></div><div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-xl bg-[#f6faf9] p-3"><div className="text-[10px] font-bold text-[var(--muted)]">Mata Kuliah</div><div className="mt-1 text-xl font-black">{row.claimCount}</div></div><div className="rounded-xl bg-[#f6faf9] p-3"><div className="text-[10px] font-bold text-[var(--muted)]">Mulai Dinilai</div><div className="mt-1 text-xl font-black">{row.scoredClaims}/{row.claimCount}</div></div></div><div className="mt-4 text-sm font-black text-[var(--rpl-green-800)]">Buka Asesmen <i className="bi bi-arrow-right ml-1" /></div></Link>)}{!rows.length && <div className="rpl-card p-8 text-center text-sm text-[var(--muted)] lg:col-span-2">Belum ada peserta yang diplot kepada Anda.</div>}</section></div>;
}
