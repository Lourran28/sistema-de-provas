import type { Student, StudentBatchResponse, StudentFilters, StudentInput } from "../types/students";
import { apiDelete, apiGet, apiPatch, apiPost } from "./httpClient";

export function getStudents(filters: StudentFilters = {}) {
  const query = new URLSearchParams();
  if (filters.search?.trim()) {
    query.set("search", filters.search.trim());
  }
  if (filters.classGroup?.trim()) {
    query.set("classGroup", filters.classGroup.trim());
  }
  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  return apiGet<Student[]>(`/students${suffix}`);
}

export function createStudent(input: StudentInput) {
  return apiPost<Student>("/students", input);
}

export function createStudentsBatch(students: StudentInput[]) {
  return apiPost<StudentBatchResponse>("/students/batch", { students });
}

export function updateStudent(studentId: string, input: StudentInput) {
  return apiPatch<Student>(`/students/${studentId}`, input);
}

export function deleteStudent(studentId: string) {
  return apiDelete(`/students/${studentId}`);
}
