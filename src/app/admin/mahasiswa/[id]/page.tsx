import { notFound } from "next/navigation";
import { ParticipantPhoto } from "@/components/participant-photo";
import { requireProfile } from "@/lib/auth";
import { extractLegacyPhotoUrl } from "@/lib/participant-photo";
import { createAdminClient } from "@/lib/supabase/admin";
import { ParticipantEditForm } from "../participant-edit-form";

export const metadata = { title: "Kelola Mahasiswa" };
export const dynamic = "force-dynamic";

export default async function AdminParticipantDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireProfile("admin");
  const { id } = await params;
  const admin = createAdminClient();
  const [{ data: participant }, { data: programs }] = await Promise.all([
    admin.from("participants").select("id,registration_no,participant_no,full_name,email,phone,birth_date,program_id,legacy_payload,program:programs(name),profile:profiles(active)").eq("id", id).maybeSingle(),
    admin.from("programs").select("id,name").eq("active", true).order("name")
  ]);
  if (!participant) notFound();
  return <div className="space-y-5"><section className="flex items-center gap-4"><ParticipantPhoto registrationNo={participant.registration_no} directUrl={extractLegacyPhotoUrl(participant.legacy_payload)} name={participant.full_name} className="h-20 w-20 sm:h-24 sm:w-24" iconClassName="text-4xl" /><div><div className="text-xs font-black uppercase tracking-[.12em] text-[var(--rpl-orange)]">Calon Mahasiswa</div><h1 className="mt-1 text-2xl font-black text-[var(--rpl-green-950)]">{participant.full_name}</h1><p className="mt-2 text-sm text-[var(--muted)]">{participant.registration_no} • {(participant.program as any)?.name}</p></div></section><ParticipantEditForm participant={participant as any} programs={programs || []} /></div>;
}
