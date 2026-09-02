export type UserRole = "TEACHER" | "ADMIN";

export type AuthenticatedUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export type AuthenticationResponse = {
  accessToken: string;
  tokenType: "Bearer";
  expiresAt: string;
  user: AuthenticatedUser;
};

export type LoginCredentials = {
  email: string;
  password: string;
};

export type RegistrationData = LoginCredentials & {
  name: string;
};

export type ProfileUpdateInput = {
  name: string;
  email: string;
};

export type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
};
