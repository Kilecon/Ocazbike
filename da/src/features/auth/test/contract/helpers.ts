import { expect } from "bun:test";
import { createApp } from "../../../../appFactory";
import { loadAuthConfig } from "../../config";
import type { PasswordHasher } from "../../password";
import type {
  RefreshSession,
  RefreshSessionRepository,
  UserRepository,
} from "../../repositories";
import type { User, UserRole } from "../../types";

const config = loadAuthConfig({
  JWT_SECRET: "c".repeat(32),
  SPA_APP_ID: "contract-spa",
  COOKIE_SECURE: "true",
  BCRYPT_ROUNDS: "4",
});

const passwords: PasswordHasher = {
  hash: async (password) => `hashed:${password}`,
  compare: async (password, hash) => hash === `hashed:${password}`,
};

class ContractUsers implements UserRepository {
  constructor(readonly values: User[]) {}

  async findByEmail(email: string) {
    return this.values.find((user) => user.email === email) ?? null;
  }

  async findById(id: number) {
    return this.values.find((user) => user.id === id) ?? null;
  }

  async create(user: Omit<User, "id">) {
    const created = {
      ...user,
      id: Math.max(...this.values.map(({ id }) => id)) + 1,
    };
    this.values.push(created);
    return created;
  }

  async updatePassword(id: number, passwordHash: string) {
    const user = await this.findById(id);
    if (user) {
      user.passwordHash = passwordHash;
      user.mustChangePassword = false;
    }
  }

  async setRole(id: number, role: UserRole) {
    const user = await this.findById(id);
    if (user) user.role = role;
  }

  async setActive(id: number, isActive: boolean) {
    const user = await this.findById(id);
    if (user) user.isActive = isActive;
  }

  async list(activeOnly = true, limit = 10, offset = 0) {
    return this.values
      .filter((user) => !activeOnly || user.isActive)
      .slice(offset, offset + limit)
      .map(({ passwordHash: _passwordHash, ...user }) => user);
  }

  async recordLogin(id: number, timestamp = Date.now()) {
    const user = await this.findById(id);
    if (user) user.lastLoginAtEpochMs = timestamp;
  }

  async recordLogout() {}
}

class ContractSessions implements RefreshSessionRepository {
  private readonly values = new Map<string, RefreshSession>();

  async create(session: RefreshSession) {
    this.values.set(session.id, session);
  }

  async findById(id: string) {
    return this.values.get(id) ?? null;
  }

  async revoke(id: string, revokedAt = new Date()) {
    const session = this.values.get(id);
    if (session) session.revokedAt = revokedAt;
  }

  async revokeAllForUser(userId: number) {
    for (const session of this.values.values()) {
      if (session.userId === userId) session.revokedAt = new Date();
    }
  }

  async delete(id: string) {
    this.values.delete(id);
  }

  async limitActiveSessions() {}
}

function makeUser(
  id: number,
  role: UserRole,
  isActive = true,
  lastLoginAtEpochMs: number | null = 1_792_537_641_665,
): User {
  const now = 1_792_537_641_665;
  return {
    id,
    email: id === 1 ? "admin@example.com" : `user${id}@example.com`,
    firstname: id === 1 ? "Admin" : `User${id}`,
    lastname: "Contract",
    passwordHash: "hashed:StrongPasswordSecure",
    role,
    isActive,
    mustChangePassword: false,
    lastLoginAtEpochMs,
    createdAtEpochMs: now - 1_000,
    updatedAtEpochMs: now,
  };
}

export function createHarness() {
  const users = new ContractUsers([
    makeUser(1, "Admin"),
    makeUser(2, "Subadmin"),
    makeUser(3, "Subadmin", false, null),
  ]);
  const sessions = new ContractSessions();
  const app = createApp(config, { users, sessions, passwords });

  const request = (path: string, init: RequestInit = {}) => {
    const headers = new Headers(init.headers);
    headers.set("X-App-Id", "contract-spa");
    if (init.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    return app.handle(
      new Request(`http://localhost${path}`, { ...init, headers }),
    );
  };

  const login = (
    email = "admin@example.com",
    password = "StrongPasswordSecure",
  ) =>
    request("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

  const adminAuthorization = async () => {
    const response = await login();
    const body = await response.json();
    return `Bearer ${body.accessToken}`;
  };

  return { app, login, request, users, adminAuthorization };
}

export const json = (body: unknown) => ({
  "Content-Type": "application/json",
  body: JSON.stringify(body),
});

export const cookieValue = (setCookie: string | null) =>
  setCookie?.split(";")[0] ?? "";

export async function expectError(
  response: Response,
  status: number,
  code: string,
  message: string,
) {
  expect(response.status).toBe(status);
  expect(await response.json()).toEqual({ code, message });
}

export function expectAuthResponse(
  body: Record<string, unknown>,
  expectedUser: Record<string, unknown>,
) {
  expect(body).toEqual({
    accessToken: expect.any(String),
    expiresIn: expect.any(Number),
    user: expectedUser,
  });
  expect(typeof body.expiresIn).toBe("number");
  if (typeof body.expiresIn === "number") {
    expect(body.expiresIn).toBe(config.accessTokenTtlSeconds);
  }
  expect(typeof body.accessToken).toBe("string");
  if (typeof body.accessToken === "string") {
    expect(body.accessToken.length).toBeGreaterThan(0);
    expect(body.accessToken.split(".")).toHaveLength(3);
  }
}

export function expectManagedUserShape(user: Record<string, unknown>) {
  expect(Object.keys(user).sort()).toEqual(
    [
      "id",
      "email",
      "firstname",
      "lastname",
      "role",
      "isActive",
      "mustChangePassword",
      "lastLoginAtEpochMs",
      "createdAtEpochMs",
      "updatedAtEpochMs",
    ].sort(),
  );
  expect(Number.isSafeInteger(user.id)).toBe(true);
  expect(typeof user.id).toBe("number");
  if (typeof user.id === "number") expect(user.id).toBeGreaterThan(0);
  expect(typeof user.email).toBe("string");
  expect(typeof user.firstname).toBe("string");
  expect(typeof user.lastname).toBe("string");
  expect(user.role === "Admin" || user.role === "Subadmin").toBe(true);
  expect(typeof user.isActive).toBe("boolean");
  expect(typeof user.mustChangePassword).toBe("boolean");
  for (const timestamp of [
    user.lastLoginAtEpochMs,
    user.createdAtEpochMs,
    user.updatedAtEpochMs,
  ]) {
    expect(
      timestamp === null ||
        (typeof timestamp === "number" && Number.isSafeInteger(timestamp)),
    ).toBe(true);
  }
  expect(user.createdAtEpochMs).not.toBeNull();
  expect(user.updatedAtEpochMs).not.toBeNull();
}
