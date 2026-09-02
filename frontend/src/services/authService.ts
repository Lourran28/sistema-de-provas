import type {
  AuthenticatedUser,
  AuthenticationResponse,
  ChangePasswordInput,
  LoginCredentials,
  ProfileUpdateInput,
  RegistrationData,
} from "../types/auth";

import { apiGet, apiPatch, apiPost } from "./httpClient";

export function login(credentials: LoginCredentials) {
  return apiPost<AuthenticationResponse>("/auth/login", credentials);
}

export function loginDemo() {
  return apiPost<AuthenticationResponse>("/auth/demo", {});
}

export function register(data: RegistrationData) {
  return apiPost<AuthenticationResponse>("/auth/register", data);
}

export function getCurrentUser() {
  return apiGet<AuthenticatedUser>("/auth/me");
}

export function updateProfile(input: ProfileUpdateInput) {
  return apiPatch<AuthenticatedUser>("/auth/me", input);
}

export function changePassword(input: ChangePasswordInput) {
  return apiPatch<void>("/auth/me/password", input);
}
