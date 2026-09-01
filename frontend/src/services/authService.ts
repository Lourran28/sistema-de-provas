import type {
  AuthenticatedUser,
  AuthenticationResponse,
  LoginCredentials,
  ProfileUpdateInput,
  RegistrationData,
} from "../types/auth";

import { apiGet, apiPatch, apiPost } from "./httpClient";

export function login(credentials: LoginCredentials) {
  return apiPost<AuthenticationResponse>("/api/auth/login", credentials);
}

export function loginDemo() {
  return apiPost<AuthenticationResponse>("/api/auth/demo", {});
}

export function register(data: RegistrationData) {
  return apiPost<AuthenticationResponse>("/api/auth/register", data);
}

export function getCurrentUser() {
  return apiGet<AuthenticatedUser>("/api/auth/me");
}

export function updateProfile(input: ProfileUpdateInput) {
  return apiPatch<AuthenticatedUser>("/api/auth/me", input);
}
