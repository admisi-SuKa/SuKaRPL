import { BrandLogo } from "@/components/brand-logo";

export default function OfflinePage() {
  return (
    <main className="min-h-screen grid place-items-center p-6 bg-[var(--bg)]">
      <div className="rpl-card max-w-md w-full p-7 text-center">
        <div className="flex justify-center mb-5"><BrandLogo /></div>
        <i className="bi bi-wifi-off text-5xl text-[var(--rpl-orange)]" aria-hidden="true" />
        <h1 className="text-xl font-black mt-4">Koneksi internet terputus</h1>
        <p className="text-sm text-[var(--muted)] mt-2 leading-6">
          SuKaRPL membutuhkan koneksi internet untuk menyimpan pengajuan, asesmen, dan hasil rekognisi.
        </p>
      </div>
    </main>
  );
}
