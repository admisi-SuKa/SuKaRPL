"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateManagedUserAction } from "../actions";

type UserRow = {
  id: string;
  user_id: string;
  role: "participant" | "prodi" | "assessor" | "admin";
  full_name: string;
  email: string | null;
  active: boolean;
  program?: { name: string } | null;
  identifier?: string | null;
};

export function UserManager({ users }: { users: UserRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("ALL");
  const [edit, setEdit] = useState<null | { profileId: string; fullName: string; email: string; active: boolean; password: string }>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const filtered = useMemo(() => users.filter((u) => {
    const hay = `${u.full_name} ${u.email || ""} ${u.identifier || ""} ${u.program?.name || ""}`.toLowerCase();
    return (role === "ALL" || u.role === role) && hay.includes(query.toLowerCase());
  }), [users, query, role]);

  function save() {
    if (!edit) return;
    setMsg(null);
    startTransition(async () => {
      const result = await updateManagedUserAction(edit);
      if (result.ok) {
        setMsg({ ok: true, text: "User berhasil diperbarui." });
        setEdit(null);
        router.refresh();
      } else setMsg({ ok: false, text: result.error || "Gagal memperbarui user." });
    });
  }

  const roleLabel: Record<string,string> = { participant: "Mahasiswa", prodi: "Prodi", assessor: "Asesor", admin: "Admin" };

  return <div className="space-y-4">
    {msg && <div className={`rounded-xl border p-3 text-sm font-bold ${msg.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>{msg.text}</div>}
    <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
      <input className="rpl-input" placeholder="Cari nama, email, NIP/no pendaftaran, Prodi..." value={query} onChange={(e) => setQuery(e.target.value)} />
      <select className="rpl-select" value={role} onChange={(e) => setRole(e.target.value)}><option value="ALL">Semua Role</option><option value="participant">Mahasiswa</option><option value="assessor">Asesor</option><option value="prodi">Prodi</option><option value="admin">Admin</option></select>
    </div>

    {edit && <section className="rounded-2xl border-2 border-[var(--rpl-green-100)] bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3"><div><h2 className="font-black">Edit User</h2><p className="mt-1 text-xs text-[var(--muted)]">Password baru opsional, minimal 10 karakter jika diisi.</p></div><button className="rpl-btn rpl-btn-secondary text-xs" onClick={() => setEdit(null)}><i className="bi bi-x-lg" /> Tutup</button></div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-4"><div><label className="rpl-label">Nama</label><input className="rpl-input" value={edit.fullName} onChange={(e) => setEdit({ ...edit, fullName: e.target.value })} /></div><div><label className="rpl-label">Email Internal</label><input className="rpl-input" type="email" value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /></div><div><label className="rpl-label">Password Baru</label><input className="rpl-input" type="password" placeholder="Kosongkan jika tetap" value={edit.password} onChange={(e) => setEdit({ ...edit, password: e.target.value })} /></div><label className="flex items-end gap-2 pb-3 font-bold"><input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /> Akun aktif</label></div>
      <div className="mt-3 flex justify-end"><button className="rpl-btn rpl-btn-primary" disabled={pending} onClick={save}><i className="bi bi-floppy" /> Simpan User</button></div>
    </section>}

    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {filtered.map((u) => <article key={u.id} className="rpl-card p-4"><div className="flex items-start gap-3"><div className="grid h-10 w-10 place-items-center rounded-full bg-[var(--rpl-green-50)] text-[var(--rpl-green-800)]"><i className={`bi ${u.role === "participant" ? "bi-mortarboard" : u.role === "assessor" ? "bi-person-badge" : u.role === "prodi" ? "bi-building" : "bi-shield-lock"}`} /></div><div className="min-w-0 flex-1"><div className="font-black">{u.full_name}</div><div className="mt-1 text-xs text-[var(--muted)]">{roleLabel[u.role]}{u.identifier ? ` • ${u.identifier}` : ""}</div><div className="truncate text-xs text-[var(--muted)]">{u.email || "-"}</div><div className="mt-1 text-xs font-bold text-[var(--rpl-green-800)]">{u.program?.name || "Lintas Program"}</div></div><span className={`rpl-pill ${u.active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{u.active ? "Aktif" : "Nonaktif"}</span></div><button className="rpl-btn rpl-btn-secondary mt-4 w-full text-xs" onClick={() => setEdit({ profileId: u.id, fullName: u.full_name, email: u.email || "", active: u.active, password: "" })}><i className="bi bi-pencil-square" /> Edit User / Password</button></article>)}
      {!filtered.length && <div className="text-sm text-[var(--muted)]">Tidak ada user sesuai filter.</div>}
    </div>
  </div>;
}
