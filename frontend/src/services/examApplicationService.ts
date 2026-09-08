import type { ExamApplication, ExamApplicationInput, UpcomingExamApplication } from "../types/exams";
import { apiGet, apiPost } from "./httpClient";

export function getExamApplications(examId: string) {
  return apiGet<ExamApplication[]>(`/exams/${examId}/applications`);
}

export function createExamApplication(examId: string, input: ExamApplicationInput) {
  return apiPost<ExamApplication>(`/exams/${examId}/applications`, input);
}

export function getUpcomingExamApplications(days = 7) {
  return apiGet<UpcomingExamApplication[]>(`/exams/applications/upcoming?days=${days}`);
}
