"use client";

import { useActionState, useState } from "react";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = {};
const roles = [
  { id: "participant", label: "Mahasiswa", icon: "bi-person" },
  { id: "prodi", label: "Prodi", icon: "bi-building" },
  { id: "assessor", label: "Asesor", icon: "bi-clipboard-check" }
] as const;

export function LoginForm() {
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

      <div className="mb-4">
        <label className="rpl-label" htmlFor="email">Email akun</label>
        <div className="relative">
          <i className="bi bi-envelope absolute left-3 top-1/2 -translate-y-1/2 text-[#789089]" aria-hidden="true" />
          <input id="email" name="email" type="email" autoComplete="username" className="rpl-input pl-10" placeholder="nama@uin-suka.ac.id" required />
        </div>
      </div>

      <div className="mb-5">
        <label className="rpl-label" htmlFor="password">Password</label>
        <div className="relative">
          <i className="bi bi-lock absolute left-3 top-1/2 -translate-y-1/2 text-[#789089]" aria-hidden="true" />
          <input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" className="rpl-input pl-10 pr-11" placeholder="Masukkan password" required />
          <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-[#60756f]" aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}>
            <i className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`} aria-hidden="true" />
          </button>
        </div>
      </div>

      <button disabled={pending} className="rpl-btn rpl-btn-primary w-full" type="submit">
        {pending ? <><span className="animate-spin"><i className="bi bi-arrow-repeat" /></span> Memproses...</> : <><i className="bi bi-box-arrow-in-right" /> Masuk ke SuKaRPL</>}
      </button>

      {process.env.NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS === "true" && (
        <div className="mt-5 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 leading-5">
          <strong>Mode demo:</strong> setelah menjalankan <code>npm run seed:demo</code>, kredensial contoh tersedia di README.
        </div>
      )}
    </form>
  );
}
