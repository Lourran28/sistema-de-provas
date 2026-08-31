import type { Content, ContentFilters, ContentInput, ContentPage } from "../types/contents";
import { apiDelete, apiGet, apiPatch, apiPost } from "./httpClient";

export function getContents(filters: ContentFilters = {}) {
  const query = new URLSearchParams();
  appendQuery(query, "search", filters.search);
  appendQuery(query, "subjectId", filters.subjectId);
  appendQuery(query, "topic", filters.topic);
  appendQuery(query, "page", filters.page);
  appendQuery(query, "size", filters.size);
  const suffix = query.size > 0 ? `?${query.toString()}` : "";

  return apiGet<ContentPage>(`/contents${suffix}`);
}

export function getContentTopics() {
  return apiGet<string[]>("/contents/topics");
}

export function createContent(input: ContentInput) {
  return apiPost<Content>("/contents", input);
}

export function updateContent(contentId: string, input: ContentInput) {
  return apiPatch<Content>(`/contents/${contentId}`, input);
}

export function deleteContent(contentId: string) {
  return apiDelete(`/contents/${contentId}`);
}

function appendQuery(query: URLSearchParams, key: string, value: string | number | undefined) {
  if (value !== undefined && value !== "") {
    query.set(key, String(value));
  }
}
