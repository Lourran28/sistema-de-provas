import { apiGet } from "./httpClient";

export type HealthResponse = {
  status: string;
  service: string;
  schemaVersion: number;
  timestamp: string;
};

export function getApiHealth() {
  return apiGet<HealthResponse>("/health");
}
