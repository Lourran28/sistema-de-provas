import type { Subject, SubjectInput } from "../types/contents";
import { apiDelete, apiGet, apiPatch, apiPost } from "./httpClient";

export function getSubjects() {
  return apiGet<Subject[]>("/subjects");
}

export function createSubject(input: SubjectInput) {
  return apiPost<Subject>("/subjects", input);
}

export function updateSubject(subjectId: string, input: SubjectInput) {
  return apiPatch<Subject>(`/subjects/${subjectId}`, input);
}

export function deleteSubject(subjectId: string) {
  return apiDelete(`/subjects/${subjectId}`);
}
