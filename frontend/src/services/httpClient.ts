const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080/api";
const ACCESS_TOKEN_STORAGE_KEY = "provas.access-token";

type ApiErrorPayload = {
  message?: string;
  fieldErrors?: Record<string, string>;
};

export class ApiRequestError extends Error {
  readonly fieldErrors: Record<string, string>;
  readonly status: number;

  constructor(status: number, message: string, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
}

export function storeAccessToken(token: string) {
  localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
}

export function clearAccessToken() {
  localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
}

export async function apiRequest<TResponse>(path: string, init: RequestInit = {}): Promise<TResponse> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const accessToken = getAccessToken();
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (!response.ok) {
    const error = await readApiError(response);
    throw new ApiRequestError(response.status, error.message, error.fieldErrors);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return response.json() as Promise<TResponse>;
}

export function apiGet<TResponse>(path: string) {
  return apiRequest<TResponse>(path);
}

export function apiPost<TResponse>(path: string, body: unknown) {
  return apiRequest<TResponse>(path, {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export function apiPatch<TResponse>(path: string, body: unknown) {
  return apiRequest<TResponse>(path, {
    method: "PATCH",
    body: JSON.stringify(body)
  });
}

export function apiDelete<TResponse = void>(path: string) {
  return apiRequest<TResponse>(path, { method: "DELETE" });
}

export async function apiDownload(path: string, fallbackFilename: string) {
  const headers = new Headers({ Accept: "application/octet-stream" });
  const accessToken = getAccessToken();
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`${API_URL}${path}`, { headers });
  if (!response.ok) {
    const error = await readApiError(response);
    throw new ApiRequestError(response.status, error.message, error.fieldErrors);
  }

  const blob = await response.blob();
  const link = document.createElement("a");
  const objectUrl = URL.createObjectURL(blob);
  link.href = objectUrl;
  link.download = downloadFilename(response.headers.get("Content-Disposition"), fallbackFilename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

async function readApiError(response: Response): Promise<Required<ApiErrorPayload>> {
  try {
    const payload = (await response.json()) as ApiErrorPayload;
    return {
      message: payload.message ?? "Não foi possível concluir a solicitação.",
      fieldErrors: payload.fieldErrors ?? {}
    };
  } catch {
    return {
      message: "Não foi possível concluir a solicitação.",
      fieldErrors: {}
    };
  }
}

function downloadFilename(contentDisposition: string | null, fallbackFilename: string) {
  const encodedMatch = contentDisposition?.match(/filename\*=UTF-8''([^;]+)/i);
  if (encodedMatch?.[1]) {
    return decodeURIComponent(encodedMatch[1]);
  }
  const filenameMatch = contentDisposition?.match(/filename="?([^";]+)"?/i);
  return filenameMatch?.[1] ?? fallbackFilename;
}
