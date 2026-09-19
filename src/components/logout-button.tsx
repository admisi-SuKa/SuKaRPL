"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button type="button" onClick={logout} disabled={busy} className={compact ? "p-2.5 rounded-xl hover:bg-[#edf5f2]" : "rpl-btn rpl-btn-secondary w-full justify-start"}>
      <i className="bi bi-box-arrow-right" aria-hidden="true" />
      {!compact && (busy ? "Keluar..." : "Keluar")}
    </button>
  );
}
