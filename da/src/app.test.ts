import { describe, expect, it } from "bun:test";
import { createApp } from "./appFactory";
import { loadAuthConfig } from "./features/auth/config";
import { BcryptPasswordHasher } from "./features/auth/password";
import type {
  RefreshSession,
  RefreshSessionRepository,
  UserRepository,
} from "./features/auth/repositories";
import type { User } from "./features/auth/types";
import { RequestRateLimiter } from "./shared/rate-limiting/RequestRateLimiter";

const config = loadAuthConfig({
  JWT_SECRET: "a".repeat(32),
  SPA_APP_ID: "app-test-spa",
});

const notUsed = async (): Promise<never> => {
  throw new Error("Repository should not be called by the CORS preflight");
};

const users: UserRepository = {
  findByEmail: (_email: string): Promise<User | null> => notUsed(),
  findById: (_id: number): Promise<User | null> => notUsed(),
  create: (_user: Omit<User, "id">): Promise<User> => notUsed(),
  updatePassword: (_id: number, _hash: string): Promise<void> => notUsed(),
  setRole: (_id, _role, _timestamp): Promise<void> => notUsed(),
  setActive: (_id, _active, _timestamp): Promise<void> => notUsed(),
  list: (_activeOnly, _limit, _offset): ReturnType<UserRepository["list"]> =>
    notUsed(),
  recordLogin: (_id, _timestamp): Promise<void> => notUsed(),
  recordLogout: (_id, _timestamp): Promise<void> => notUsed(),
};

const sessions: RefreshSessionRepository = {
  create: (_session: RefreshSession): Promise<void> => notUsed(),
  findById: (_id: string): Promise<RefreshSession | null> => notUsed(),
  revoke: (_id, _revokedAt): Promise<void> => notUsed(),
  revokeAllForUser: (_userId: number): Promise<void> => notUsed(),
  delete: (_id: string): Promise<void> => notUsed(),
  limitActiveSessions: (_userId, _maxActive): Promise<void> => notUsed(),
};

const app = createApp(config, {
  users,
  sessions,
  passwords: new BcryptPasswordHasher(config.bcryptRounds),
});

describe("application CORS", () => {
  it("allows the SPA CORS preflight request", async () => {
    const response = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "OPTIONS",
        headers: {
          Origin: "http://localhost:3111",
          "Access-Control-Request-Method": "POST",
          "Access-Control-Request-Headers": "X-App-Id, Authorization",
        },
      }),
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "http://localhost:3111",
    );
  });
});

describe("application rate limiting", () => {
  it("limits requests across routes and returns Retry-After", async () => {
    const limitedApp = createApp(
      config,
      {
        users,
        sessions,
        passwords: new BcryptPasswordHasher(config.bcryptRounds),
      },
      {
        requestRateLimiter: new RequestRateLimiter({
          maxRequests: 1,
          windowMs: 60_000,
          now: () => 10_000,
        }),
      },
    );

    const firstResponse = await limitedApp.handle(
      new Request("http://localhost/", {
        headers: { "X-App-Id": config.appId },
      }),
    );
    const secondResponse = await limitedApp.handle(
      new Request("http://localhost/health", {
        headers: { "X-App-Id": config.appId },
      }),
    );

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(429);
    expect(secondResponse.headers.get("Retry-After")).toBe("60");
    expect(await secondResponse.json()).toEqual({
      code: "TOO_MANY_REQUESTS",
      message: "Too many requests, try again later",
    });
  });
});
