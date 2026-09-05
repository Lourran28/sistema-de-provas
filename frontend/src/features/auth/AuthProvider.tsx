import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { getCurrentUser, login, loginDemo, register, updateProfile as updateProfileRequest } from "../../services/authService";
import { clearAccessToken, getAccessToken, storeAccessToken } from "../../services/httpClient";
import type { AuthenticatedUser, LoginCredentials, ProfileUpdateInput, RegistrationData } from "../../types/auth";
import { AuthContext } from "./authContext";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(() => !getAccessToken());
  const [user, setUser] = useState<AuthenticatedUser | null>(null);

  useEffect(() => {
    const initialToken = getAccessToken();
    if (!initialToken) {
      return;
    }

    let ignore = false;

    getCurrentUser()
      .then((currentUser) => {
        if (!ignore && getAccessToken() === initialToken) {
          setUser(currentUser);
        }
      })
      .catch(() => {
        if (!ignore && getAccessToken() === initialToken) {
          clearAccessToken();
          setUser(null);
        }
      })
      .finally(() => {
        if (!ignore) {
          setIsReady(true);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  const signIn = useCallback(async (credentials: LoginCredentials) => {
    const response = await login(credentials);
    storeAccessToken(response.accessToken);
    setUser(response.user);
  }, []);

  const signInDemo = useCallback(async () => {
    const response = await loginDemo();
    storeAccessToken(response.accessToken);
    setUser(response.user);
  }, []);

  const signUp = useCallback(async (data: RegistrationData) => {
    const response = await register(data);
    storeAccessToken(response.accessToken);
    setUser(response.user);
  }, []);

  const signOut = useCallback(() => {
    clearAccessToken();
    setUser(null);
    setIsReady(true);
  }, []);

  const updateProfile = useCallback(async (data: ProfileUpdateInput) => {
    const updatedUser = await updateProfileRequest(data);
    setUser(updatedUser);
  }, []);

  const value = useMemo(
    () => ({ isReady, signIn, signInDemo, signOut, signUp, updateProfile, user }),
    [isReady, signIn, signInDemo, signOut, signUp, updateProfile, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
