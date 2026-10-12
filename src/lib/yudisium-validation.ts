/**
 * Satu sumber aturan kelengkapan nilai untuk halaman yudisium dan server action.
 * OBE: nilai dibutuhkan HANYA untuk CPMK yang dipilih pada course_claim_cpmks.
 * NON_OBE: nilai dibutuhkan untuk scope COURSE.
 */
export type YudisiumClaim = {
  id: string;
  course?: { code?: string | null; name?: string | null; assessment_type?: string | null } | null;
};

export type SelectedCpmk = {
  course_claim_id: string;
  cpmk_id: string;
  cpmk?: { code?: string | null } | null;
};

export type YudisiumScore = {
  assessor_id: string;
  course_claim_id: string;
  score_scope: string;
  score: number | string | null;
};

export type AssessmentProgress = {
  claimId: string;
  courseLabel: string;
  requiredScopes: string[];
  missingAssessor1: string[];
  missingAssessor2: string[];
  missingLabelsAssessor1: string[];
  missingLabelsAssessor2: string[];
  noCpmkSelected: boolean;
  assessor1Complete: boolean;
  assessor2Complete: boolean;
};

export function getAssessmentProgress(
  claims: YudisiumClaim[],
  selectedCpmks: SelectedCpmk[],
  scores: YudisiumScore[],
  assessor1Id: string,
  assessor2Id: string
): AssessmentProgress[] {
  return claims.map((claim) => {
    const isObe = claim.course?.assessment_type === "OBE";
    const selected = isObe ? selectedCpmks.filter((c) => c.course_claim_id === claim.id) : [];
    const requiredScopes = isObe ? [...new Set(selected.map((c) => c.cpmk_id))] : ["COURSE"];
    const labelByScope = new Map(selected.map((c) => [c.cpmk_id, c.cpmk?.code || c.cpmk_id]));
    const filledFor = (assessorId: string) => new Set(
      scores.filter((s) => s.course_claim_id === claim.id && s.assessor_id === assessorId && s.score !== null && s.score !== undefined)
        .map((s) => s.score_scope)
    );
    const filled1 = filledFor(assessor1Id);
    const filled2 = filledFor(assessor2Id);
    const missingAssessor1 = requiredScopes.filter((scope) => !filled1.has(scope));
    const missingAssessor2 = requiredScopes.filter((scope) => !filled2.has(scope));
    const noCpmkSelected = isObe && requiredScopes.length === 0;
    return {
      claimId: claim.id,
      courseLabel: [claim.course?.code, claim.course?.name].filter(Boolean).join(" - ") || claim.id,
      requiredScopes,
      missingAssessor1,
      missingAssessor2,
      missingLabelsAssessor1: missingAssessor1.map((s) => labelByScope.get(s) || s),
      missingLabelsAssessor2: missingAssessor2.map((s) => labelByScope.get(s) || s),
      noCpmkSelected,
      assessor1Complete: !noCpmkSelected && missingAssessor1.length === 0,
      assessor2Complete: !noCpmkSelected && missingAssessor2.length === 0
    };
  });
}
