import type { AuthTokens } from "./types";

const apiBaseUrl =
  import.meta.env?.BUN_PUBLIC_API_URL ?? "http://localhost:3000";
const appId = import.meta.env?.BUN_PUBLIC_APP_ID ?? "my-spa";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function setTokens(tokens: AuthTokens) {
  localStorage.setItem("accessToken", tokens.accessToken);
  localStorage.setItem("refreshToken", tokens.refreshToken);
}

export function clearSession() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
}

export async function request<T>(
  path: string,
  options: RequestInit = {},
  canRefresh = true,
): Promise<T> {
  const token = localStorage.getItem("accessToken");
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-App-Id": appId,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (response.status === 401 && canRefresh && path !== "/auth/refresh") {
    const refreshToken = localStorage.getItem("refreshToken");
    if (refreshToken) {
      try {
        const tokens = await request<AuthTokens>(
          "/auth/refresh",
          {
            method: "POST",
            body: JSON.stringify({ refreshToken }),
          },
          false,
        );
        setTokens(tokens);
        return request<T>(path, options, false);
      } catch {
        clearSession();
      }
    }
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new ApiError(
      body?.message ?? `Request failed (${response.status})`,
      response.status,
    );
  }

  return response.json() as Promise<T>;
}

export function storeSession(tokens: AuthTokens) {
  setTokens(tokens);
}
