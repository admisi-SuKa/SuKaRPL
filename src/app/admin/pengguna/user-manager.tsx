"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ParticipantPhoto } from "@/components/participant-photo";
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
  registrationNo?: string | null;
  photoUrl?: string | null;
};

type EditState = {
  profileId: string;
  fullName: string;
  email: string;
  active: boolean;
  password: string;
};

export function UserManager({ users }: { users: UserRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("ALL");
  const [edit, setEdit] = useState<EditState | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const filtered = useMemo(() => users.filter((u) => {
    const hay = `${u.full_name} ${u.email || ""} ${u.identifier || ""} ${u.program?.name || ""}`.toLowerCase();
    return (role === "ALL" || u.role === role) && hay.includes(query.toLowerCase());
  }), [users, query, role]);

  function beginEdit(user: UserRow) {
    setMsg(null);
    setEdit({ profileId: user.id, fullName: user.full_name, email: user.email || "", active: user.active, password: "" });
  }

  function save() {
    if (!edit) return;
    setMsg(null);
    startTransition(async () => {
      const result = await updateManagedUserAction(edit);
      if (result.ok) {
        setMsg({ ok: true, text: "Pengguna berhasil diperbarui." });
        setEdit(null);
        router.refresh();
      } else {
        setMsg({ ok: false, text: result.error || "Gagal memperbarui pengguna." });
      }
    });
  }

  const roleLabel: Record<string, string> = { participant: "Mahasiswa", prodi: "Prodi", assessor: "Asesor", admin: "Administrator" };

  return (
    <div className="space-y-4">
      {msg && <div className={`rounded-xl border p-3 text-sm font-bold ${msg.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>{msg.text}</div>}

      <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
        <input className="rpl-input" placeholder="Cari nama, email, NIP/no pendaftaran, Prodi..." value={query} onChange={(e) => setQuery(e.target.value)} />
        <select className="rpl-select" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="ALL">Semua Role</option>
          <option value="participant">Mahasiswa</option>
          <option value="assessor">Asesor</option>
          <option value="prodi">Prodi</option>
          <option value="admin">Administrator</option>
        </select>
      </div>

      <section className="rpl-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] border-collapse text-sm">
            <thead>
              <tr className="bg-[#f3f8f6] text-left text-[11px] uppercase tracking-wide text-[var(--rpl-green-800)]">
                <th className="p-3">Foto</th>
                <th className="p-3">Nama Pengguna</th>
                <th className="p-3">Role</th>
                <th className="p-3">Identitas</th>
                <th className="p-3">Program Studi</th>
                <th className="p-3">Email Internal</th>
                <th className="p-3">Status</th>
                <th className="p-3">Password Baru</th>
                <th className="p-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {filtered.map((u) => {
                const isEditing = edit?.profileId === u.id;
                return (
                  <tr key={u.id} className={isEditing ? "bg-emerald-50/40" : "hover:bg-[#fbfdfc]"}>
                    <td className="p-3">
                      {u.role === "participant" ? (
                        <ParticipantPhoto registrationNo={u.registrationNo} directUrl={u.photoUrl} name={u.full_name} className="h-11 w-11" />
                      ) : (
                        <div className="grid h-11 w-11 place-items-center rounded-full border border-[var(--line)] bg-[#eef5f3] text-[var(--rpl-green-700)]">
                          <i className={`bi ${u.role === "assessor" ? "bi-person-badge" : u.role === "prodi" ? "bi-building" : "bi-shield-lock"} text-lg`} />
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      {isEditing ? <input className="rpl-input min-w-56" value={edit.fullName} onChange={(e) => setEdit({ ...edit, fullName: e.target.value })} /> : <div className="font-black text-[var(--rpl-green-950)]">{u.full_name}</div>}
                    </td>
                    <td className="p-3"><span className="rpl-pill bg-[#f0f6f4] text-[#526761]">{roleLabel[u.role]}</span></td>
                    <td className="p-3 font-bold">{u.identifier || "-"}</td>
                    <td className="p-3">{u.program?.name || "Lintas Program"}</td>
                    <td className="p-3">
                      {isEditing ? <input className="rpl-input min-w-64" type="email" value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /> : <span className="break-all text-xs text-[var(--muted)]">{u.email || "-"}</span>}
                    </td>
                    <td className="p-3">
                      {isEditing ? (
                        <label className="inline-flex items-center gap-2 font-bold"><input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /> Aktif</label>
                      ) : (
                        <span className={`rpl-pill ${u.active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{u.active ? "Aktif" : "Nonaktif"}</span>
                      )}
                    </td>
                    <td className="p-3">
                      {isEditing ? <input className="rpl-input min-w-52" type="password" placeholder="Kosong = tetap" value={edit.password} onChange={(e) => setEdit({ ...edit, password: e.target.value })} /> : <span className="text-xs text-[var(--muted)]">••••••••••</span>}
                    </td>
                    <td className="p-3 text-right">
                      {isEditing ? (
                        <div className="flex justify-end gap-2">
                          <button type="button" className="rpl-btn rpl-btn-secondary text-xs" disabled={pending} onClick={() => setEdit(null)}><i className="bi bi-x-lg" /> Batal</button>
                          <button type="button" className="rpl-btn rpl-btn-primary text-xs" disabled={pending} onClick={save}><i className="bi bi-floppy" /> Simpan</button>
                        </div>
                      ) : (
                        <button type="button" className="rpl-btn rpl-btn-secondary text-xs" onClick={() => beginEdit(u)}><i className="bi bi-pencil-square" /> Edit</button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!filtered.length && <tr><td colSpan={9} className="p-8 text-center text-sm text-[var(--muted)]">Tidak ada pengguna sesuai filter.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="border-t border-[var(--line)] bg-[#fbfdfc] px-4 py-3 text-xs text-[var(--muted)]">Password lama tidak pernah ditampilkan. Isi kolom <strong>Password Baru</strong> hanya ketika ingin menggantinya, minimal 10 karakter.</div>
      </section>
    </div>
  );
}
