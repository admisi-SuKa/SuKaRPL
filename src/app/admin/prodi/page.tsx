import { redirect } from "next/navigation";

export const metadata = { title: "Pengguna" };

export default function LegacyAdminProdiPage() {
  redirect("/admin/pengguna");
}
