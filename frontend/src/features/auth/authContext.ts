import { createContext } from "react";

import type { AuthenticatedUser, LoginCredentials, ProfileUpdateInput, RegistrationData } from "../../types/auth";

export type AuthContextValue = {
  isReady: boolean;
  signIn: (credentials: LoginCredentials) => Promise<void>;
  signInDemo: () => Promise<void>;
  signOut: () => void;
  signUp: (data: RegistrationData) => Promise<void>;
  updateProfile: (data: ProfileUpdateInput) => Promise<void>;
  user: AuthenticatedUser | null;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
