"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="min-h-screen grid place-items-center p-5"><div className="rpl-card max-w-md p-6 text-center"><i className="bi bi-exclamation-triangle text-4xl text-[var(--rpl-orange)]" /><h1 className="mt-4 text-xl font-black">Terjadi kesalahan</h1><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Permintaan tidak dapat diproses. Coba ulangi, dan periksa koneksi jika masalah berlanjut.</p><button className="rpl-btn rpl-btn-primary mt-4" onClick={() => reset()}><i className="bi bi-arrow-clockwise" /> Coba Lagi</button></div></main>;
}
