import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { getCurrentProfile, roleHome } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { LoginForm } from "./login-form";

export const metadata = { title: "Login" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const profile = await getCurrentProfile();
  if (profile) redirect(roleHome(profile.role));

  const admin = createAdminClient();
  const { data: programs } = await admin
    .from("programs")
    .select("id,code,name")
    .eq("active", true)
    .order("name");

  return (
    <main className="min-h-dvh bg-white lg:grid lg:grid-cols-[1.08fr_.92fr]">
      <section className="login-campus-image relative hidden min-h-dvh lg:flex lg:flex-col lg:justify-between p-10 xl:p-14 text-white">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/15 px-4 py-2 text-sm font-bold backdrop-blur-sm">
            <i className="bi bi-mortarboard-fill" /> UIN Sunan Kalijaga Yogyakarta
          </div>
        </div>
        <div className="relative z-10 max-w-xl">
          <div className="mb-5 h-1.5 w-20 rounded-full bg-[var(--rpl-orange)]" />
          <h1 className="text-4xl xl:text-5xl font-black leading-tight tracking-tight">Rekognisi pengalaman menjadi capaian akademik yang terukur.</h1>
          <p className="mt-5 max-w-lg text-base xl:text-lg leading-8 text-white/85">Pengajuan mata kuliah, bukti berbasis tautan, asesmen dua asesor, yudisium, dan hasil rekognisi dalam satu portal.</p>
        </div>
        <div className="relative z-10 text-xs font-semibold text-white/65">SuKaRPL • Portal Rekognisi Pembelajaran Lampau</div>
      </section>

      <section className="min-h-dvh grid place-items-center px-5 py-8 sm:px-8 lg:px-12">
        <div className="w-full max-w-md">
          <BrandLogo />
          <div className="mt-8">
            <p className="text-xs font-black uppercase tracking-[.14em] text-[var(--rpl-orange)]">Portal Akademik</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-[var(--rpl-green-950)]">Selamat datang</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Mahasiswa masuk dengan Nomor Pendaftaran, Asesor dengan NIP, dan Prodi dengan pilihan program studi.</p>
          </div>
          <LoginForm programs={programs || []} />
          <p className="mt-7 text-center text-[11px] leading-5 text-[#81918d]">Data asesmen dan rekognisi diproses melalui koneksi terenkripsi. Jangan bagikan password akun Anda.</p>
        </div>
      </section>
    </main>
  );
}
