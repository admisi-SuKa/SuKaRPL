"use client";

import { useActionState, useState } from "react";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = {};
const roles = [
  { id: "participant", label: "Mahasiswa", icon: "bi-person" },
  { id: "prodi", label: "Prodi", icon: "bi-building" },
  { id: "assessor", label: "Asesor", icon: "bi-clipboard-check" }
] as const;

type ProgramOption = { id: string; code: string; name: string };

export function LoginForm({ programs }: { programs: ProgramOption[] }) {
  const [role, setRole] = useState<(typeof roles)[number]["id"]>("participant");
  const [showPassword, setShowPassword] = useState(false);
  const [state, action, pending] = useActionState(loginAction, initialState);

  return (
    <form action={action} className="mt-7">
      <input type="hidden" name="role" value={role} />

      <div className="grid grid-cols-3 gap-1 rounded-xl bg-[#edf5f2] p-1 mb-6">
        {roles.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setRole(item.id)}
            className={`rounded-lg px-2 py-2.5 text-xs sm:text-sm font-black transition ${role === item.id ? "bg-white text-[var(--rpl-green-800)] shadow-sm" : "text-[#6a7c77]"}`}
          >
            <i className={`bi ${item.icon} mr-1.5`} aria-hidden="true" />{item.label}
          </button>
        ))}
      </div>

      {state.error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700" role="alert">
          <i className="bi bi-exclamation-circle mr-2" aria-hidden="true" />{state.error}
        </div>
      )}

      {role === "participant" && (
        <div className="mb-4">
          <label className="rpl-label" htmlFor="participantIdentifier">Nomor Pendaftaran</label>
          <div className="relative">
            <i className="bi bi-person-vcard rpl-field-icon" aria-hidden="true" />
            <input
              id="participantIdentifier"
              name="identifier"
              type="text"
              inputMode="numeric"
              autoComplete="username"
              className="rpl-input rpl-input-with-icon"
              placeholder="Masukkan nomor pendaftaran"
              required
            />
          </div>
        </div>
      )}

      {role === "assessor" && (
        <div className="mb-4">
          <label className="rpl-label" htmlFor="assessorIdentifier">NIP Asesor</label>
          <div className="relative">
            <i className="bi bi-person-badge rpl-field-icon" aria-hidden="true" />
            <input
              id="assessorIdentifier"
              name="identifier"
              type="text"
              inputMode="numeric"
              autoComplete="username"
              className="rpl-input rpl-input-with-icon"
              placeholder="Masukkan NIP"
              required
            />
          </div>
        </div>
      )}

      {role === "prodi" && (
        <div className="mb-4">
          <label className="rpl-label" htmlFor="programId">Program Studi</label>
          <div className="relative">
            <i className="bi bi-building rpl-field-icon" aria-hidden="true" />
            <select id="programId" name="programId" className="rpl-select rpl-input-with-icon" defaultValue="" required>
              <option value="" disabled>Pilih program studi</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>{program.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="mb-5">
        <label className="rpl-label" htmlFor="password">Password</label>
        <div className="relative">
          <i className="bi bi-lock rpl-field-icon" aria-hidden="true" />
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            className="rpl-input rpl-input-with-icon rpl-input-with-action"
            placeholder="Masukkan password"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="rpl-field-action"
            aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
          >
            <i className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`} aria-hidden="true" />
          </button>
        </div>
      </div>

      <button disabled={pending} className="rpl-btn rpl-btn-primary w-full" type="submit">
        {pending ? <><span className="animate-spin"><i className="bi bi-arrow-repeat" /></span> Memproses...</> : <><i className="bi bi-box-arrow-in-right" /> Masuk ke SuKaRPL</>}
      </button>

      {process.env.NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS === "true" && (
        <div className="mt-5 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 leading-5">
          <strong>Mode demo:</strong> setelah menjalankan <code>npm run seed:demo</code>, gunakan Nomor Pendaftaran/NIP/Prodi dan password demo yang tersedia di README.
        </div>
      )}
    </form>
  );
}
