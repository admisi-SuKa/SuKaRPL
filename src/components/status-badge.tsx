import { statusLabel } from "@/lib/utils";

const variants: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SUBMITTED: "bg-blue-50 text-blue-700",
  RETURNED: "bg-amber-50 text-amber-800",
  ASSESSMENT: "bg-violet-50 text-violet-700",
  YUDISIUM: "bg-orange-50 text-orange-700",
  FINAL: "bg-emerald-50 text-emerald-700"
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={`rpl-pill ${variants[status] || "bg-slate-100 text-slate-700"}`}>{statusLabel(status)}</span>;
}
