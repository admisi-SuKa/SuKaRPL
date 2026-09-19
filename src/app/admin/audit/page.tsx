import { requireProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Audit Log" };
export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  await requireProfile("admin");
  const admin = createAdminClient();
  const { data: logs } = await admin.from("audit_logs").select("id,actor_user_id,program_id,action,entity_type,entity_id,metadata,created_at,program:programs(name)").order("created_at", { ascending: false }).limit(200);
  const actorIds = Array.from(new Set((logs || []).map((x: any) => x.actor_user_id).filter(Boolean)));
  let actors: any[] = [];
  if (actorIds.length) {
    const { data } = await admin.from("profiles").select("user_id,full_name,role").in("user_id", actorIds);
    actors = data || [];
  }
  const actorMap = new Map(actors.map((a: any) => [a.user_id, a]));

  return (
    <div className="space-y-5">
      <section><div className="text-xs font-black uppercase tracking-[.12em] text-[var(--rpl-orange)]">Administrator</div><h1 className="mt-1 text-2xl font-black text-[var(--rpl-green-950)]">Audit Log</h1><p className="mt-2 text-sm text-[var(--muted)]">200 aktivitas terbaru. Password tidak pernah disimpan pada audit log.</p></section>
      <section className="rpl-card overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full min-w-[900px] border-collapse text-sm"><thead><tr className="bg-[#f3f8f6] text-left text-[11px] uppercase tracking-wide text-[var(--rpl-green-800)]"><th className="p-3">Waktu</th><th className="p-3">Aktor</th><th className="p-3">Aksi</th><th className="p-3">Entitas</th><th className="p-3">Program</th><th className="p-3">Metadata</th></tr></thead><tbody className="divide-y divide-[var(--line)]">{(logs || []).map((log: any) => { const actor = actorMap.get(log.actor_user_id); return <tr key={log.id}><td className="p-3 text-xs text-[var(--muted)]">{formatDateTime(log.created_at)}</td><td className="p-3"><div className="font-bold">{actor?.full_name || "System"}</div><div className="text-[10px] uppercase text-[var(--muted)]">{actor?.role || "-"}</div></td><td className="p-3 font-black text-[var(--rpl-green-800)]">{log.action}</td><td className="p-3"><div>{log.entity_type}</div><div className="text-[10px] text-[var(--muted)]">{log.entity_id || "-"}</div></td><td className="p-3">{log.program?.name || "Semua"}</td><td className="p-3"><code className="text-[10px] whitespace-pre-wrap break-all">{JSON.stringify(log.metadata || {})}</code></td></tr>; })}</tbody></table></div>
      </section>
    </div>
  );
}
