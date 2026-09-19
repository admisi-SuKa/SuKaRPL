export const DEFAULT_ADMISI_PHOTO_BASE_URL = "https://servdev2.admisi.uin-suka.ac.id/storage/foto";

export function extractLegacyPhotoUrl(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const record = payload as Record<string, unknown>;
  const keys = ["link_foto", "link_poto", "foto", "photo", "photo_url", "foto_url"];
  for (const key of keys) {
    const value = String(record[key] || "").trim();
    if (/^https?:\/\//i.test(value)) return value;
  }
  return null;
}
