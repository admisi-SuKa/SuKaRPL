import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils";
import { SettingsForm } from "./settings-form";

export const metadata = { title: "Yudisium" };

export default async function YudisiumPage() {
  const profile = await requireProfile(["prodi", "admin"]);
  const supabase = await createClient();
  const programId = profile.program_id!;
  const [{ data: settings }, { data: applications }] = await Promise.all([
    supabase.from("program_settings").select("head_name,head_nip").eq("program_id", programId).maybeSingle(),
    supabase.from("applications").select("id,status,submitted_at,finalized_at,participant:participants(participant_no,full_name)").eq("program_id", programId).in("status", ["SUBMITTED","ASSESSMENT","YUDISIUM","FINAL"]).order("updated_at", { ascending: false })
  ]);
  const appIds = (applications || []).map((a) => a.id);
  let responses: any[] = [];
  if (appIds.length) {
    const { data } = await supabase.from("recognition_responses").select("application_id,response,note,responded_at").in("application_id", appIds);
    responses = data || [];
  }

  return (
    <div className="space-y-5">
      <section><div className="text-xs font-black uppercase tracking-[.12em] text-[var(--rpl-orange)]">Tahap Akhir</div><h1 className="mt-1 text-2xl sm:text-3xl font-black text-[var(--rpl-green-950)]">Yudisium & Rekognisi</h1><p className="mt-2 text-sm text-[var(--muted)]">Tetapkan keputusan YA/TIDAK setelah hasil kedua asesor lengkap.</p></section>
      <SettingsForm initialName={settings?.head_name} initialNip={settings?.head_nip} />
      <section className="rpl-card overflow-hidden"><div className="border-b border-[var(--line)] p-5"><h2 className="font-black text-[var(--rpl-green-950)]">Daftar Peserta</h2></div><div className="divide-y divide-[var(--line)]">{(applications || []).map((app: any) => { const response = responses.find((r) => r.application_id === app.id); return <Link href={`/prodi/yudisium/${app.id}`} key={app.id} className="flex flex-col gap-3 p-4 hover:bg-[#fbfdfc] sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><div className="text-xs font-black text-[var(--rpl-green-800)]">{app.participant?.participant_no}</div><div className="mt-1 font-black">{app.participant?.full_name}</div><div className="mt-1 text-[11px] text-[var(--muted)]">Dikirim {formatDateTime(app.submitted_at)}{app.finalized_at ? ` • Final ${formatDateTime(app.finalized_at)}` : ""}</div></div><div className="flex items-center gap-2"><StatusBadge status={app.status} />{response && <span className={`rpl-pill ${response.response === "SETUJU" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{response.response === "SETUJU" ? "Mahasiswa Setuju" : "Keberatan"}</span>}<i className="bi bi-chevron-right text-[#899994]" /></div></Link>; })}{!applications?.length && <div className="p-8 text-center text-sm text-[var(--muted)]">Belum ada peserta pada tahap asesmen/yudisium.</div>}</div></section>
    </div>
  );
}
