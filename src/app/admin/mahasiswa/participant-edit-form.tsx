"use client";

import { useActionState } from "react";
import { resetParticipantPasswordAction, updateParticipantAdminAction, type AdminActionState } from "../actions";

const initialState: AdminActionState = {};

type Program = { id: string; name: string };
type Participant = {
  id: string;
  registration_no: string | null;
  participant_no: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  program_id: string;
};

export function ParticipantEditForm({ participant, programs }: { participant: Participant; programs: Program[] }) {
  const [editState, editAction, editPending] = useActionState(updateParticipantAdminAction, initialState);
  const [resetState, resetAction, resetPending] = useActionState(resetParticipantPasswordAction, initialState);

  return (
    <div className="space-y-5">
      <form action={editAction} className="rpl-card p-4 sm:p-5 space-y-4">
        <input type="hidden" name="id" value={participant.id} />
        <div><h2 className="text-lg font-black text-[var(--rpl-green-950)]">Edit Data Mahasiswa</h2><p className="mt-1 text-xs text-[var(--muted)]">Perubahan data administratif tidak mengubah nilai atau keputusan akademik.</p></div>
        {editState.error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{editState.error}</div>}
        {editState.ok && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{editState.message}</div>}
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="rpl-label">Nomor Pendaftaran</label><input name="registrationNo" defaultValue={participant.registration_no || ""} className="rpl-input" required /></div>
          <div><label className="rpl-label">Nomor Peserta</label><input name="participantNo" defaultValue={participant.participant_no} className="rpl-input" required /></div>
        </div>
        <div><label className="rpl-label">Nama Lengkap</label><input name="fullName" defaultValue={participant.full_name} className="rpl-input" required /></div>
        <div><label className="rpl-label">Email internal/Auth</label><input name="email" type="email" defaultValue={participant.email || ""} className="rpl-input" required /></div>
        <div><label className="rpl-label">Program Studi</label><select name="programId" defaultValue={participant.program_id} className="rpl-select" required>{programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="rpl-label">Tanggal Lahir</label><input name="birthDate" type="date" defaultValue={participant.birth_date || ""} className="rpl-input" /></div>
          <div><label className="rpl-label">No. HP</label><input name="phone" defaultValue={participant.phone || ""} className="rpl-input" /></div>
        </div>
        <button type="submit" disabled={editPending} className="rpl-btn rpl-btn-primary"><i className="bi bi-save" />{editPending ? "Menyimpan..." : "Simpan Perubahan"}</button>
      </form>

      <form action={resetAction} className="rpl-card p-4 sm:p-5">
        <input type="hidden" name="id" value={participant.id} />
        <h2 className="text-lg font-black text-[var(--rpl-green-950)]">Reset Password Mahasiswa</h2>
        <p className="mt-1 text-xs leading-5 text-[var(--muted)]">Password lama tidak dapat dilihat. Sistem membuat password sementara baru dan hanya menampilkannya setelah reset.</p>
        {resetState.error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{resetState.error}</div>}
        {resetState.ok && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4"><div className="text-xs font-bold text-amber-900">{resetState.message}</div>{resetState.temporaryPassword && <div className="mt-2 rounded-lg bg-white px-3 py-2 font-mono font-black">{resetState.temporaryPassword}</div>}</div>}
        <button type="submit" disabled={resetPending} className="rpl-btn rpl-btn-secondary mt-4"><i className="bi bi-key" />{resetPending ? "Mereset..." : "Generate Password Baru"}</button>
      </form>
    </div>
  );
}
