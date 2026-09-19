export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(value));
}

export function formatDateTime(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
  }).format(new Date(value));
}

export function statusLabel(status: string) {
  const map: Record<string, string> = {
    DRAFT: "Draft",
    SUBMITTED: "Diajukan",
    RETURNED: "Perlu Revisi",
    ASSESSMENT: "Asesmen",
    YUDISIUM: "Yudisium",
    FINAL: "Final"
  };
  return map[status] || status;
}
