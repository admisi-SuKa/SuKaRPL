"use client";

import { useActionState } from "react";
import { createParticipantAdminAction, type AdminActionState } from "../actions";

const initialState: AdminActionState = {};

type Program = { id: string; name: string };

export function ParticipantCreateForm({ programs }: { programs: Program[] }) {
  const [state, action, pending] = useActionState(createParticipantAdminAction, initialState);

  return (
    <form action={action} className="space-y-4">
      {state.error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700"><i className="bi bi-exclamation-circle mr-2" />{state.error}</div>}
      {state.ok && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <div className="font-black"><i className="bi bi-check-circle mr-2" />Mahasiswa berhasil dibuat</div>
          <p className="mt-1 text-xs leading-5">{state.message}</p>
          {state.temporaryPassword && <div className="mt-3 rounded-lg bg-white px-3 py-2 font-mono text-sm font-black tracking-wide">{state.temporaryPassword}</div>}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="rpl-label">Nomor Pendaftaran</label><input name="registrationNo" className="rpl-input" required /></div>
        <div><label className="rpl-label">Nomor Peserta</label><input name="participantNo" className="rpl-input" required /></div>
      </div>
      <div><label className="rpl-label">Nama Lengkap</label><input name="fullName" className="rpl-input" required /></div>
      <div><label className="rpl-label">Email internal/Auth</label><input name="email" type="email" className="rpl-input" required /><p className="mt-1 text-[11px] text-[var(--muted)]">Mahasiswa tetap login menggunakan Nomor Pendaftaran. Email hanya dipakai oleh Supabase Auth.</p></div>
      <div><label className="rpl-label">Program Studi</label><select name="programId" className="rpl-select" defaultValue="" required><option value="" disabled>Pilih program studi</option>{programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="rpl-label">Tanggal Lahir</label><input name="birthDate" type="date" className="rpl-input" /></div>
        <div><label className="rpl-label">No. HP</label><input name="phone" className="rpl-input" /></div>
      </div>
      <button type="submit" disabled={pending} className="rpl-btn rpl-btn-primary w-full sm:w-auto"><i className="bi bi-person-plus" />{pending ? "Membuat akun..." : "Tambah Calon Mahasiswa"}</button>
    </form>
  );
}
