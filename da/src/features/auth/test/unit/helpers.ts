import { mock } from "bun:test";
import type { AuthConfig } from "../../config";
import type {
  IRefreshSessionRepository,
  IUserRepository,
  RefreshSession,
  UserStatus,
} from "../../IAuthRepositories";
import { JwtService } from "../../jwt";
import type { LoginRateLimiter } from "../../loginRateLimiter";
import type { PasswordHasher } from "../../password";
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
    findByEmail: mock((email: string) =>
      Promise.resolve(
        [...userRecords.values()].find((user) => user.email === email) ?? null,
      ),
    ),
    findById: mock((id: number) => Promise.resolve(userRecords.get(id) ?? null)),
    create: mock((input: Omit<User, "id">) => {
      const user: User = {
        id: Math.max(0, ...userRecords.keys()) + 1,
        ...input,
      };
      userRecords.set(user.id, user);
      return Promise.resolve(user);
    }),
    updatePassword: mock(
      (id: number, passwordHash: string, timestamp = Date.now()) => {
        const user = userRecords.get(id);
        if (user) {
          user.passwordHash = passwordHash;
          user.mustChangePassword = false;
          user.updatedAtEpochMs = timestamp;
        }
        return Promise.resolve();
      },
    ),
    setRole: mock((id: number, role: User["role"]) => {
      const user = userRecords.get(id);
      if (user) user.role = role;
      return Promise.resolve();
    }),
    setActive: mock((id: number, isActive: boolean) => {
      const user = userRecords.get(id);
      if (user) user.isActive = isActive;
      return Promise.resolve();
    }),
    list: mock(
      (activeOnly = true, limit = 10, offset = 0, status?: UserStatus) =>
        Promise.resolve(
          [...userRecords.values()]
            .filter((user) =>
              status
                ? status === "all" || user.isActive === (status === "active")
                : !activeOnly || user.isActive,
            )
            .slice(offset, offset + limit)
            .map(({ passwordHash: _passwordHash, ...user }) => user),
        ),
    ),
    countByStatus: mock(() => {
      const users = [...userRecords.values()];
      const active = users.filter((user) => user.isActive).length;
      return Promise.resolve({
        all: users.length,
        active,
        inactive: users.length - active,
      });
    }),
    recordLogin: mock((id: number, timestamp = Date.now()) => {
      const user = userRecords.get(id);
      if (user) user.lastLoginAtEpochMs = timestamp;
      return Promise.resolve();
    }),
    recordLogout: mock(() => Promise.resolve()),
  } satisfies IUserRepository;

  const sessions = {
    create: mock((session: RefreshSession) => {
      sessionRecords.set(session.id, structuredClone(session));
      return Promise.resolve();
    }),
    findById: mock((id: string) =>
      Promise.resolve(sessionRecords.get(id) ?? null),
    ),
    revoke: mock((id: string, revokedAt = new Date()) => {
      const session = sessionRecords.get(id);
      if (session) session.revokedAt = revokedAt;
      return Promise.resolve();
    }),
    revokeAllForUser: mock((userId: number) => {
      for (const session of sessionRecords.values()) {
        if (session.userId === userId) session.revokedAt = new Date();
      }
      return Promise.resolve();
    }),
    delete: mock((id: string) => {
      sessionRecords.delete(id);
      return Promise.resolve();
    }),
    limitActiveSessions: mock(() => Promise.resolve()),
  } satisfies IRefreshSessionRepository;

  const passwords = {
    hash: mock((password: string) => Promise.resolve(`hash:${password}`)),
    compare: mock((password: string, hash: string) =>
      Promise.resolve(hash === `hash:${password}`),
    ),
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
