import type { Correction, CorrectionInput } from "../types/corrections";
import { apiDelete, apiGet, apiPatch, apiPost } from "./httpClient";

export function getCorrections() {
  return apiGet<Correction[]>("/corrections");
}

export function createCorrection(input: CorrectionInput) {
  return apiPost<Correction>("/corrections", input);
}

export function updateCorrection(correctionId: string, input: CorrectionInput) {
  return apiPatch<Correction>(`/corrections/${correctionId}`, input);
}

export function confirmCorrection(correctionId: string) {
  return apiPost<Correction>(`/corrections/${correctionId}/confirm`, {});
}

export function confirmCorrectionBatch(examVersionId: string, classGroup: string) {
  return apiPost<{ confirmedCount: number; corrections: Correction[] }>("/corrections/confirm-batch", {
    examVersionId,
    classGroup
  });
}

export function deleteCorrection(correctionId: string) {
  return apiDelete(`/corrections/${correctionId}`);
}

export function deleteClassData(classGroup: string) {
  return apiDelete<{ deletedCorrections: number; deletedApplications: number }>(
    `/corrections/class-data?classGroup=${encodeURIComponent(classGroup)}`
  );
}
