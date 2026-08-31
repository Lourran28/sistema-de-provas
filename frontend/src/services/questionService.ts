import type { Question, QuestionClearResult, QuestionFilters, QuestionInput, QuestionPage } from "../types/questions";
import { apiDelete, apiGet, apiPatch, apiPost } from "./httpClient";

export function getQuestions(filters: QuestionFilters = {}) {
  const query = new URLSearchParams();
  appendQuery(query, "search", filters.search);
  appendQuery(query, "subjectId", filters.subjectId);
  appendQuery(query, "difficulty", filters.difficulty);
  appendQuery(query, "page", filters.page);
  appendQuery(query, "size", filters.size);
  const suffix = query.size > 0 ? `?${query.toString()}` : "";

  return apiGet<QuestionPage>(`/questions${suffix}`);
}

export function createQuestion(input: QuestionInput) {
  return apiPost<Question>("/questions", input);
}

export function updateQuestion(questionId: string, input: QuestionInput) {
  return apiPatch<Question>(`/questions/${questionId}`, input);
}

export function deleteQuestion(questionId: string) {
  return apiDelete(`/questions/${questionId}`);
}

export function clearQuestions() {
  return apiDelete<QuestionClearResult>("/questions");
}

function appendQuery(query: URLSearchParams, key: string, value: string | number | undefined) {
  if (value !== undefined && value !== "") {
    query.set(key, String(value));
  }
}
