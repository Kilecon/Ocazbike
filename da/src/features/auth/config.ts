export interface AuthConfig {
  appId: string;
  jwtSecret: string;
  accessTokenTtlSeconds: number;
  refreshTokenTtlSeconds: number;
  bcryptRounds: number;
  maxSessionsPerUser: number;
  loginRateLimitMaxFailures: number;
  loginRateLimitWindowMs: number;
  loginRateLimitLockMs: number;
  secureCookies: boolean;
}

function positiveInteger(
  name: string,
  value: string | undefined,
  fallback: number,
): number {
  const parsed = value === undefined ? fallback : Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }

  return parsed;
}

export function loadAuthConfig(
  env: Record<string, string | undefined> = process.env,
): AuthConfig {
  const jwtSecret = env.JWT_SECRET;

  if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters");
  }

  return {
    appId: env.SPA_APP_ID ?? "my-spa",
    jwtSecret,
    accessTokenTtlSeconds: positiveInteger(
      "JWT_ACCESS_TTL_SECONDS",
      env.JWT_ACCESS_TTL_SECONDS,
      900,
    ),
    refreshTokenTtlSeconds: positiveInteger(
      "JWT_REFRESH_TTL_SECONDS",
      env.JWT_REFRESH_TTL_SECONDS,
      2_592_000,
    ),
    bcryptRounds: positiveInteger("BCRYPT_ROUNDS", env.BCRYPT_ROUNDS, 12),
    maxSessionsPerUser: positiveInteger(
      "MAX_SESSIONS_PER_USER",
      env.MAX_SESSIONS_PER_USER,
      5,
    ),
    loginRateLimitMaxFailures: positiveInteger(
      "LOGIN_RATE_LIMIT_MAX_FAILURES",
      env.LOGIN_RATE_LIMIT_MAX_FAILURES,
      5,
    ),
    loginRateLimitWindowMs: positiveInteger(
      "LOGIN_RATE_LIMIT_WINDOW_MS",
      env.LOGIN_RATE_LIMIT_WINDOW_MS,
      900_000,
    ),
    loginRateLimitLockMs: positiveInteger(
      "LOGIN_RATE_LIMIT_LOCK_MS",
      env.LOGIN_RATE_LIMIT_LOCK_MS,
      900_000,
    ),
    // Secure cookies by default; set COOKIE_SECURE=false for plain-HTTP local development.
    secureCookies: env.COOKIE_SECURE
      ? env.COOKIE_SECURE === "true"
      : env.NODE_ENV === "production",
  };
}
