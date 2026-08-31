import type { Correction, CorrectionInput } from "../types/corrections";
import { apiGet, apiPatch, apiPost } from "./httpClient";

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
