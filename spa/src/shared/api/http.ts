// Bun inlines `process.env.BUN_PUBLIC_*` at bundle time only when the variable
// is defined; otherwise `process` does not exist in the browser.
function publicEnv(read: () => string | undefined, fallback: string): string {
  try {
    return read() || fallback;
  } catch {
    return fallback;
  }
}

const apiBaseUrl = publicEnv(
  () => process.env.BUN_PUBLIC_API_URL,
  "http://localhost:3000",
);
const appId = publicEnv(() => process.env.BUN_PUBLIC_APP_ID, "my-spa");

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

// Auth tokens live in HttpOnly cookies; only remove keys left by older builds.
const legacyTokenStorageKeys = ["accessToken", "refreshToken"] as const;

export function removeLegacyStoredTokens() {
  try {
    for (const key of legacyTokenStorageKeys) localStorage.removeItem(key);
  } catch {
    // Storage may be unavailable (privacy mode); nothing to clean up then.
  }
}

let refreshInFlight: Promise<unknown> | null = null;

// Concurrent 401s share one refresh call: rotation invalidates the token after first use.
function refreshSession(): Promise<unknown> {
  refreshInFlight ??= request<unknown>(
    "/auth/refresh",
    { method: "POST" },
    false,
  ).finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

export async function request<T>(
  path: string,
  options: RequestInit = {},
  canRefresh = true,
): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-App-Id": appId,
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
      // Refresh failed: surface the original 401 so callers treat it as logged out.
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
