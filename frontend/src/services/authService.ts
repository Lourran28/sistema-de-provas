import type {
  AuthenticatedUser,
  AuthenticationResponse,
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginCredentials,
  ProfileUpdateInput,
  RegistrationData,
  ResetPasswordInput,
} from "../types/auth";

import { apiPatch, apiPost, apiRequest } from "./httpClient";

function publicAuthOptions() {
  return { anonymous: true, signal: AbortSignal.timeout(120_000) };
}

export function login(credentials: LoginCredentials) {
  return apiPost<AuthenticationResponse>("/auth/login", credentials, publicAuthOptions());
}

export function loginDemo() {
  return apiPost<AuthenticationResponse>("/auth/demo", {}, publicAuthOptions());
}

export function register(data: RegistrationData) {
  return apiPost<AuthenticationResponse>("/auth/register", data, publicAuthOptions());
}

export function getCurrentUser() {
  return apiRequest<AuthenticatedUser>("/auth/me", { signal: AbortSignal.timeout(120_000) });
}

export function updateProfile(input: ProfileUpdateInput) {
  return apiPatch<AuthenticatedUser>("/auth/me", input);
}

export function changePassword(input: ChangePasswordInput) {
  return apiPatch<void>("/auth/me/password", input);
}

export function requestPasswordReset(input: ForgotPasswordInput) {
  return apiPost<void>("/auth/password/forgot", input, publicAuthOptions());
}

export function resetPassword(input: ResetPasswordInput) {
  return apiPost<void>("/auth/password/reset", input, publicAuthOptions());
}
