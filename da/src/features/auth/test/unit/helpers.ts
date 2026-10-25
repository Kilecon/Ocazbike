import { mock } from "bun:test";
import type { AuthConfig } from "../../config";
import { JwtService } from "../../jwt";
import type { LoginRateLimiter } from "../../loginRateLimiter";
import type { PasswordHasher } from "../../password";
import type {
  RefreshSession,
  RefreshSessionRepository,
  UserRepository,
} from "../../repositories";
import { AuthService } from "../../service";
import type { User } from "../../types";

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    email: "admin@example.com",
    firstname: "Admin",
    lastname: "User",
    passwordHash: "hash:valid-password",
    role: "Admin",
    isActive: true,
    mustChangePassword: false,
    lastLoginAtEpochMs: null,
    createdAtEpochMs: 1,
    updatedAtEpochMs: 1,
    ...overrides,
  };
}

export function requireTestValue<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("Expected test fixture value");
  return value;
}

const testConfig: AuthConfig = {
  appId: "test-spa",
  jwtSecret: "unit-test-secret-that-is-at-least-32-characters",
  accessTokenTtlSeconds: 900,
  refreshTokenTtlSeconds: 3600,
  bcryptRounds: 4,
  maxSessionsPerUser: 2,
  loginRateLimitMaxFailures: 5,
  loginRateLimitWindowMs: 900_000,
  loginRateLimitLockMs: 900_000,
  secureCookies: false,
};

export function createAuthFixture(
  initialUsers: User[] = [makeUser()],
  options: {
    limiter?: LoginRateLimiter;
  } = {},
) {
  const userRecords = new Map(
    initialUsers.map((user) => [user.id, structuredClone(user)]),
  );
  const sessionRecords = new Map<string, RefreshSession>();

  const users = {
    findByEmail: mock(async (email: string) => {
      return (
        [...userRecords.values()].find((user) => user.email === email) ?? null
      );
    }),
    findById: mock(async (id: number) => userRecords.get(id) ?? null),
    create: mock(async (input: Omit<User, "id">) => {
      const user: User = {
        id: Math.max(0, ...userRecords.keys()) + 1,
        ...input,
      };
      userRecords.set(user.id, user);
      return user;
    }),
    updatePassword: mock(
      async (id: number, passwordHash: string, timestamp = Date.now()) => {
        const user = userRecords.get(id);
        if (user) {
          user.passwordHash = passwordHash;
          user.mustChangePassword = false;
          user.updatedAtEpochMs = timestamp;
        }
      },
    ),
    setRole: mock(async (id: number, role: User["role"]) => {
      const user = userRecords.get(id);
      if (user) user.role = role;
    }),
    setActive: mock(async (id: number, isActive: boolean) => {
      const user = userRecords.get(id);
      if (user) user.isActive = isActive;
    }),
    list: mock(async (activeOnly = true, limit = 10, offset = 0) =>
      [...userRecords.values()]
        .filter((user) => !activeOnly || user.isActive)
        .slice(offset, offset + limit)
        .map(({ passwordHash: _passwordHash, ...user }) => user),
    ),
    recordLogin: mock(async (id: number, timestamp = Date.now()) => {
      const user = userRecords.get(id);
      if (user) user.lastLoginAtEpochMs = timestamp;
    }),
    recordLogout: mock(async () => {}),
  } satisfies UserRepository;

  const sessions = {
    create: mock(async (session: RefreshSession) => {
      sessionRecords.set(session.id, structuredClone(session));
    }),
    findById: mock(async (id: string) => sessionRecords.get(id) ?? null),
    revoke: mock(async (id: string, revokedAt = new Date()) => {
      const session = sessionRecords.get(id);
      if (session) session.revokedAt = revokedAt;
    }),
    revokeAllForUser: mock(async (userId: number) => {
      for (const session of sessionRecords.values()) {
        if (session.userId === userId) session.revokedAt = new Date();
      }
    }),
    delete: mock(async (id: string) => {
      sessionRecords.delete(id);
    }),
    limitActiveSessions: mock(async () => {}),
  } satisfies RefreshSessionRepository;

  const passwords = {
    hash: mock(async (password: string) => `hash:${password}`),
    compare: mock(async (password: string, hash: string) => {
      return hash === `hash:${password}`;
    }),
  } satisfies PasswordHasher;
  const jwt = new JwtService(testConfig.jwtSecret);
  const service = new AuthService(
    users,
    sessions,
    passwords,
    jwt,
    testConfig,
    options.limiter,
  );

  return {
    service,
    users,
    sessions,
    passwords,
    jwt,
    userRecords,
    sessionRecords,
    config: testConfig,
  };
}
