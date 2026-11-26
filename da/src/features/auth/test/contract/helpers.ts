import { expect } from "bun:test";
import { createApp } from "../../../../appFactory";
import { sortFrenchStrings } from "../../../../shared/sort";
import { accessTokenFrom } from "../../../../tests-helpers/authCookies";
import {
  InMemoryRefreshSessionRepository,
  InMemoryUserRepository,
} from "../../../../tests-helpers/inMemoryAuthRepositories";
import { createTestRequest } from "../../../../tests-helpers/testRequest";
import { loadAuthConfig } from "../../config";
import type { PasswordHasher } from "../../password";
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
  const users = new InMemoryUserRepository(
    [
      makeUser(1, "Admin"),
      makeUser(2, "Subadmin"),
      makeUser(3, "Subadmin", false, null),
    ],
    {
      defaultActiveOnly: true,
      clearMustChangePassword: true,
      trackLogin: true,
    },
  );
  const sessions = new InMemoryRefreshSessionRepository();
  const app = createApp(config, { users, sessions, passwords });

  const request = createTestRequest(app, config.appId, true);

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
    return `access_token=${accessTokenFrom(response)}`;
  };

  return { app, login, request, users, adminAuthorization };
}

export { jsonBody as json } from "../../../../tests-helpers/jsonBody";

/** Returns the "refresh_token=..." pair from a (possibly joined) Set-Cookie header. */
export const cookieValue = (setCookie: string | null) =>
  setCookie?.match(/refresh_token=[^;,]*/)?.[0] ?? "";

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
    expiresIn: expect.any(Number),
    user: expectedUser,
  });
  expect(typeof body.expiresIn).toBe("number");
  if (typeof body.expiresIn === "number") {
    expect(body.expiresIn).toBe(config.accessTokenTtlSeconds);
  }
}

export function expectManagedUserShape(user: Record<string, unknown>) {
  expect(sortFrenchStrings(Object.keys(user))).toEqual(
    sortFrenchStrings([
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
    ]),
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
