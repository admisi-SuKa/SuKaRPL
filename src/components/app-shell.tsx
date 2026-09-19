"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { LogoutButton } from "@/components/logout-button";
import type { CurrentProfile } from "@/lib/types";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; shortLabel?: string; icon: string };

export function AppShell({ profile, nav, children }: { profile: CurrentProfile; nav: NavItem[]; children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    try {
      setSidebarCollapsed(window.localStorage.getItem("sukarpl_sidebar_collapsed") === "1");
    } catch {
      // localStorage may be unavailable in private/restricted browsing.
    }
  }, []);

  function toggleSidebar() {
    setSidebarCollapsed((current) => {
      const next = !current;
      try { window.localStorage.setItem("sukarpl_sidebar_collapsed", next ? "1" : "0"); } catch {}
      return next;
    });
  }

  const active = (href: string) => {
    if (["/mahasiswa", "/prodi", "/asesor", "/admin"].includes(href)) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <div className={cn("min-h-dvh bg-[var(--bg)] lg:grid", sidebarCollapsed ? "lg:grid-cols-[84px_1fr]" : "lg:grid-cols-[248px_1fr]")}>      
      <aside className={cn("hidden lg:flex lg:sticky lg:top-0 lg:h-dvh lg:flex-col border-r border-[var(--line)] bg-white", sidebarCollapsed ? "p-3" : "p-4")}>
        <div className={cn("py-2", sidebarCollapsed ? "flex justify-center" : "px-2")}><BrandLogo compact={sidebarCollapsed} /></div>
        <nav className="mt-7 flex-1 space-y-1.5">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              title={sidebarCollapsed ? item.label : undefined}
              className={cn(
                "flex items-center rounded-xl py-3 text-sm font-extrabold transition",
                sidebarCollapsed ? "justify-center px-2" : "gap-3 px-3",
                active(item.href) ? "bg-[var(--rpl-green-800)] text-white shadow-sm" : "text-[#526761] hover:bg-[#f1f7f5] hover:text-[var(--rpl-green-900)]"
              )}
            >
              <i className={`bi ${item.icon} text-base`} aria-hidden="true" />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>
        <div className="border-t border-[var(--line)] pt-4">
          {!sidebarCollapsed && <div className="mb-3 px-2">
            <div className="truncate text-xs font-black text-[var(--rpl-green-950)]">{profile.full_name}</div>
            <div className="mt-1 truncate text-[10px] font-semibold text-[var(--muted)]">{profile.email || profile.role}</div>
          </div>}
          <LogoutButton compact={sidebarCollapsed} />
        </div>
      </aside>

      <div className="min-w-0 pb-24 lg:pb-0">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-[var(--line)] bg-white/95 px-4 backdrop-blur lg:px-8">
          <button
            type="button"
            onClick={toggleSidebar}
            className="hidden h-10 w-10 place-items-center rounded-xl border border-[var(--line)] bg-white text-[var(--rpl-green-900)] transition hover:bg-[#f1f7f5] lg:grid"
            title={sidebarCollapsed ? "Tampilkan sidebar" : "Sembunyikan sidebar"}
            aria-label={sidebarCollapsed ? "Tampilkan sidebar" : "Sembunyikan sidebar"}
          >
            <i className={`bi ${sidebarCollapsed ? "bi-layout-sidebar-inset" : "bi-layout-sidebar-inset-reverse"}`} />
          </button>
          <div className="lg:hidden"><BrandLogo compact /></div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-black text-[var(--rpl-green-950)]">{profile.full_name}</div>
            <div className="truncate text-[10px] font-bold text-[var(--muted)]">{profile.program?.name || "SuKaRPL"}</div>
          </div>
          <div className="lg:hidden"><LogoutButton compact /></div>
        </header>
        <main className="mx-auto w-full max-w-[1500px] p-4 sm:p-5 lg:p-8">{children}</main>
      </div>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 flex overflow-x-auto border-t border-[var(--line)] bg-white/95 px-1 pt-1 shadow-[0_-8px_30px_rgba(18,57,49,.08)] backdrop-blur lg:hidden">
        {nav.map((item) => (
          <Link key={item.href} href={item.href} className={cn("flex min-h-14 min-w-[72px] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-black", active(item.href) ? "text-[var(--rpl-green-800)]" : "text-[#72847f]")}>
            <i className={`bi ${item.icon} text-lg`} aria-hidden="true" />
            <span className="max-w-full truncate">{item.shortLabel || item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
