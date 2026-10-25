import { describe, expect, it } from "bun:test";
import { loadAuthConfig } from "../../config";

describe("loadAuthConfig", () => {
  it("loads defaults and a required JWT secret", () => {
    expect(loadAuthConfig({ JWT_SECRET: "s".repeat(32) })).toEqual({
      appId: "my-spa",
      jwtSecret: "s".repeat(32),
      accessTokenTtlSeconds: 900,
      refreshTokenTtlSeconds: 2_592_000,
      bcryptRounds: 12,
      maxSessionsPerUser: 5,
      loginRateLimitMaxFailures: 5,
      loginRateLimitWindowMs: 900_000,
      loginRateLimitLockMs: 900_000,
      secureCookies: false,
    });
  });

  it("loads configured values and defaults secure cookies in production", () => {
    expect(
      loadAuthConfig({
        JWT_SECRET: "s".repeat(40),
        SPA_APP_ID: "admin-spa",
        JWT_ACCESS_TTL_SECONDS: "60",
        JWT_REFRESH_TTL_SECONDS: "3600",
        BCRYPT_ROUNDS: "4",
        MAX_SESSIONS_PER_USER: "2",
        LOGIN_RATE_LIMIT_MAX_FAILURES: "8",
        LOGIN_RATE_LIMIT_WINDOW_MS: "300000",
        LOGIN_RATE_LIMIT_LOCK_MS: "600000",
        NODE_ENV: "production",
      }),
    ).toEqual({
      appId: "admin-spa",
      jwtSecret: "s".repeat(40),
      accessTokenTtlSeconds: 60,
      refreshTokenTtlSeconds: 3600,
      bcryptRounds: 4,
      maxSessionsPerUser: 2,
      loginRateLimitMaxFailures: 8,
      loginRateLimitWindowMs: 300_000,
      loginRateLimitLockMs: 600_000,
      secureCookies: true,
    });
  });

  it("honors an explicit secure-cookie setting", () => {
    expect(
      loadAuthConfig({
        JWT_SECRET: "s".repeat(32),
        NODE_ENV: "production",
        COOKIE_SECURE: "false",
      }).secureCookies,
    ).toBe(false);
    expect(
      loadAuthConfig({
        JWT_SECRET: "s".repeat(32),
        COOKIE_SECURE: "true",
      }).secureCookies,
    ).toBe(true);
  });

  it("rejects missing or short secrets", () => {
    for (const secret of [undefined, "", "s".repeat(31)]) {
      expect(() => loadAuthConfig({ JWT_SECRET: secret })).toThrow(
        "JWT_SECRET must contain at least 32 characters",
      );
    }
  });

  it("rejects non-positive or non-integer numeric settings", () => {
    for (const [key, value] of [
      ["JWT_ACCESS_TTL_SECONDS", "0"],
      ["JWT_REFRESH_TTL_SECONDS", "-1"],
      ["BCRYPT_ROUNDS", "2.5"],
      ["MAX_SESSIONS_PER_USER", "not-a-number"],
      ["LOGIN_RATE_LIMIT_MAX_FAILURES", "0"],
      ["LOGIN_RATE_LIMIT_WINDOW_MS", "-1"],
      ["LOGIN_RATE_LIMIT_LOCK_MS", "2.5"],
    ]) {
      expect(() =>
        loadAuthConfig({ JWT_SECRET: "s".repeat(32), [key]: value }),
      ).toThrow(`${key} must be a positive integer`);
    }
  });
});
