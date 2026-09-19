import { AppShell } from "@/components/app-shell";
import { requireProfile } from "@/lib/auth";

const nav = [
  { href: "/asesor", label: "Peserta", icon: "bi-people" }
];

export default async function AssessorLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile("assessor");
  return <AppShell profile={profile} nav={nav}>{children}</AppShell>;
}
