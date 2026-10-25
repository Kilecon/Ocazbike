import type { AuthTokens } from "./types";

const apiBaseUrl =
  import.meta.env?.BUN_PUBLIC_API_URL ?? "http://localhost:3000";
const appId = import.meta.env?.BUN_PUBLIC_APP_ID ?? "my-spa";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// The refresh token lives in an HttpOnly cookie and is never readable from JS.
function setTokens(tokens: Pick<AuthTokens, "accessToken">) {
  localStorage.setItem("accessToken", tokens.accessToken);
  localStorage.removeItem("refreshToken");
}

export function clearSession() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
}

let refreshInFlight: Promise<AuthTokens> | null = null;

// Concurrent 401s share one refresh call: rotation invalidates the token after first use.
function refreshSession(): Promise<AuthTokens> {
  refreshInFlight ??= request<AuthTokens>(
    "/auth/refresh",
    { method: "POST" },
    false,
  )
    .then((tokens) => {
      setTokens(tokens);
      return tokens;
    })
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

export async function request<T>(
  path: string,
  options: RequestInit = {},
  canRefresh = true,
): Promise<T> {
  const token = localStorage.getItem("accessToken");
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-App-Id": appId,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (
    response.status === 401 &&
    canRefresh &&
    path !== "/auth/refresh" &&
    path !== "/auth/login"
  ) {
    try {
      await refreshSession();
      return request<T>(path, options, false);
    } catch {
      clearSession();
    }
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      code?: string;
      message?: string;
    } | null;
    throw new ApiError(
      body?.message ?? `Request failed (${response.status})`,
      response.status,
      body?.code,
    );
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function storeSession(tokens: AuthTokens) {
  setTokens(tokens);
}
