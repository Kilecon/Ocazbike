import { clearSession, request, storeSession } from "./api-client";
import type { AuthTokens, PublicUser } from "./types";

export { clearSession };

export function login(email: string, password: string): Promise<AuthTokens> {
  return request<AuthTokens>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  }).then((tokens) => {
    storeSession(tokens);
    return tokens;
  });
}

export function refresh(refreshToken: string): Promise<AuthTokens> {
  return request<AuthTokens>(
    "/auth/refresh",
    {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    },
    false,
  ).then((tokens) => {
    storeSession(tokens);
    return tokens;
  });
}

export function getCurrentUser(): Promise<PublicUser> {
  return request<PublicUser>("/auth/me");
}

export function logout(refreshToken: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>("/auth/logout", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
}
