import { AppShell } from "@/components/app-shell";
import { requireProfile } from "@/lib/auth";

const nav = [
  { href: "/mahasiswa", label: "Beranda", icon: "bi-house-door" },
  { href: "/mahasiswa/pengajuan", label: "Pengajuan RPL", shortLabel: "Pengajuan", icon: "bi-journal-check" },
  { href: "/mahasiswa/pembayaran", label: "Pembayaran", shortLabel: "Bayar", icon: "bi-credit-card" },
  { href: "/mahasiswa/hasil", label: "Hasil Rekognisi", shortLabel: "Hasil", icon: "bi-award" }
];

export default async function ParticipantLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile("participant");
  return <AppShell profile={profile} nav={nav}>{children}</AppShell>;
}
