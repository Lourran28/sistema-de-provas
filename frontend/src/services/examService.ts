import type { Exam, ExamClearResult, ExamInput, ExamPage, ExamVersion, GenerateExamInput } from "../types/exams";
import { apiDelete, apiDownload, apiGet, apiPatch, apiPost } from "./httpClient";

export function getExams(page = 0, size = 12) {
  return apiGet<ExamPage>(`/exams?page=${page}&size=${size}`);
}

export function createExam(input: ExamInput) {
  return apiPost<Exam>("/exams", input);
}

export function getExam(examId: string) {
  return apiGet<Exam>(`/exams/${examId}`);
}

export function deleteExam(examId: string) {
  return apiDelete(`/exams/${examId}`);
}

export function clearExams() {
  return apiDelete<ExamClearResult>("/exams");
}

export function updateExam(examId: string, input: ExamInput) {
  return apiPatch<Exam>(`/exams/${examId}`, input);
}

export function generateExam(input: GenerateExamInput) {
  return apiPost<Exam>("/exams/generate", input);
}

export function approveExam(examId: string) {
  return apiPost<Exam>(`/exams/${examId}/approve`, {});
}

export function regenerateExamQuestion(examId: string, questionId: string) {
  return apiPost<Exam>(`/exams/${examId}/questions/${questionId}/regenerate`, {});
}

export function toggleQuestionCancellation(examId: string, questionId: string) {
  return apiPost<Exam>(`/exams/${examId}/questions/${questionId}/toggle-cancellation`, {});
}

export function generateExamVersions(examId: string) {
  return apiPost<ExamVersion[]>(`/exams/${examId}/versions`, {});
}

export function getExamVersions(examId?: string) {
  return apiGet<ExamVersion[]>(examId ? `/exam-versions?examId=${examId}` : "/exam-versions");
}

export function getExamVersion(versionId: string) {
  return apiGet<ExamVersion>(`/exam-versions/${versionId}`);
}

export function downloadExamVersion(versionId: string, format: "pdf" | "docx") {
  const extension = format === "pdf" ? "pdf" : "docx";
  return apiDownload(
    `/exam-versions/${versionId}/export?format=${format}`,
    `prova-versao.${extension}`
  );
}
