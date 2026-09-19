export type UserRole = "participant" | "prodi" | "assessor" | "admin";
export type ApplicationStatus = "DRAFT" | "SUBMITTED" | "RETURNED" | "ASSESSMENT" | "YUDISIUM" | "FINAL";
export type AssessmentType = "OBE" | "NON_OBE";
export type YudisiumResult = "YA" | "TIDAK";

export interface CurrentProfile {
  id: string;
  user_id: string;
  role: UserRole;
  full_name: string;
  email: string | null;
  program_id: string | null;
  program?: { id: string; code: string; name: string } | null;
}
