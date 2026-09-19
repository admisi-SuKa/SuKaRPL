import { AppShell } from "@/components/app-shell";
import { requireProfile } from "@/lib/auth";

const nav = [
  { href: "/admin", label: "Dashboard", shortLabel: "Home", icon: "bi-grid" },
  { href: "/admin/mahasiswa", label: "Calon Mahasiswa", shortLabel: "Mhs", icon: "bi-person-lines-fill" },
  { href: "/admin/prodi", label: "Akun Prodi", shortLabel: "Prodi", icon: "bi-building-gear" },
  { href: "/admin/audit", label: "Audit Log", shortLabel: "Audit", icon: "bi-clock-history" }
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile("admin");
  return <AppShell profile={profile} nav={nav}>{children}</AppShell>;
}
