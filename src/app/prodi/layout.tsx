import { AppShell } from "@/components/app-shell";
import { requireProfile } from "@/lib/auth";

const nav = [
  { href: "/prodi", label: "Dashboard", shortLabel: "Home", icon: "bi-grid" },
  { href: "/prodi/mata-kuliah", label: "Mata Kuliah", shortLabel: "MK", icon: "bi-journal-bookmark" },
  { href: "/prodi/pembayaran", label: "Pembayaran", shortLabel: "Bayar", icon: "bi-receipt" },
  { href: "/prodi/asesor", label: "Asesor", icon: "bi-people" },
  { href: "/prodi/yudisium", label: "Yudisium", icon: "bi-patch-check" }
];

export default async function ProdiLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile(["prodi", "admin"]);
  return <AppShell profile={profile} nav={nav}>{children}</AppShell>;
}
