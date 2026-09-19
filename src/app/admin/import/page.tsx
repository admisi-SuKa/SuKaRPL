import { requireProfile } from "@/lib/auth";
import { ImportParticipants } from "./import-participants";

export const metadata = { title: "Import Calon Mahasiswa" };

export default async function AdminImportPage() {
  await requireProfile("admin");
  return <div className="space-y-5"><section><div className="text-xs font-black uppercase tracking-[.12em] text-[var(--rpl-orange)]">Administrator</div><h1 className="mt-1 text-2xl font-black text-[var(--rpl-green-950)]">Import Data</h1><p className="mt-2 text-sm text-[var(--muted)]">Import calon mahasiswa dari XLSX, XLS, atau CSV menggunakan format data Admisi/RPL.</p></section><ImportParticipants /></div>;
}
