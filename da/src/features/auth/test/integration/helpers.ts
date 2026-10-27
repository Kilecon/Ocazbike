import { expect } from "bun:test";
import { createApp } from "../../../../appFactory";
import { createTestDatabase } from "../../../../shared/database/testDatabase";
import { ClientDataProtector } from "../../../clients/crypto/ClientDataProtector";
import { loadAuthConfig } from "../../config";
import {
  DrizzleRefreshSessionRepository,
  DrizzleUserRepository,
} from "../../infrastructure/DrizzleAuthRepositories";
import { BcryptPasswordHasher } from "../../password";
import type { User } from "../../types";

export const config = loadAuthConfig({
  JWT_SECRET: "b".repeat(32),
  SPA_APP_ID: "test-spa",
  COOKIE_SECURE: "true",
  BCRYPT_ROUNDS: "4",
});

const passwordHasher = new BcryptPasswordHasher(config.bcryptRounds);
const protector = new ClientDataProtector(Buffer.alloc(32, 12));

export function createAuthIntegrationFixture(name: string) {
  const testDatabase = createTestDatabase(name);
  expect(testDatabase.sqlite.query("PRAGMA journal_mode").get()).toEqual({
    journal_mode: "wal",
  });
  const refreshSessionColumns = testDatabase.sqlite
    .query("PRAGMA table_xinfo(refresh_sessions)")
    .all() as { name: string; type: string; hidden: number }[];
  expect(
    refreshSessionColumns
      .filter(({ name }) =>
        ["expires_at_ms", "revoked_at_ms", "created_at_ms"].includes(name),
      )
      .map(({ name, type, hidden }) => [name, type, hidden])
      .sort(([left], [right]) => String(left).localeCompare(String(right))),
  ).toEqual([
    ["created_at_ms", "INTEGER", 0],
    ["expires_at_ms", "INTEGER", 0],
    ["revoked_at_ms", "INTEGER", 0],
  ]);
  expect(
    refreshSessionColumns
      .filter(({ hidden }) => hidden === 2)
      .map(({ name }) => name)
      .sort(),
  ).toEqual(["created_at", "expires_at", "revoked_at"]);
  const userColumns = testDatabase.sqlite
    .query("PRAGMA table_xinfo(users)")
    .all() as { name: string }[];
  expect(userColumns.map(({ name }) => name)).toContain("is_active");
  expect(userColumns.map(({ name }) => name)).not.toContain("_is_active");

  const users = new DrizzleUserRepository(testDatabase.database, protector);
  const sessions = new DrizzleRefreshSessionRepository(testDatabase.database);
  const app = createApp(config, { users, sessions, passwords: passwordHasher });
  let user!: User;
  let inactiveUser!: User;

  const fixture = {
    app,
    users,
    sessions,
    get user() {
      return user;
    },
    get inactiveUser() {
      return inactiveUser;
    },
    headers(extra: Record<string, string> = {}): HeadersInit {
      return { "X-App-Id": "test-spa", ...extra };
    },
    login() {
      return app.handle(
        new Request("http://localhost/auth/login", {
          method: "POST",
          headers: fixture.headers({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            email: user.email,
            password: "integration-password",
          }),
        }),
      );
    },
    async reset() {
      testDatabase.sqlite.exec(
        "DELETE FROM refresh_sessions; DELETE FROM users; DELETE FROM sqlite_sequence WHERE name = 'users';",
      );
      const now = Date.now();
      user = await users.create({
        email: "integration@example.com",
        firstname: "Int",
        lastname: "Egration",
        passwordHash: await passwordHasher.hash("integration-password"),
        role: "Admin",
        isActive: true,
        mustChangePassword: false,
        lastLoginAtEpochMs: Date.UTC(2026, 9, 20, 19, 44, 6),
        createdAtEpochMs: now,
        updatedAtEpochMs: now,
      });
      inactiveUser = await users.create({
        email: "inactive@example.com",
        firstname: "Inactive",
        lastname: "User",
        passwordHash: await passwordHasher.hash("integration-password"),
        role: "Subadmin",
        isActive: false,
        mustChangePassword: false,
        lastLoginAtEpochMs: Date.UTC(2026, 9, 20, 19, 44, 6),
        createdAtEpochMs: now,
        updatedAtEpochMs: now,
      });
    },
    cleanup() {
      testDatabase.cleanup();
    },
  };

  return fixture;
}

export type AuthIntegrationFixture = ReturnType<
  typeof createAuthIntegrationFixture
>;

export function expectedPublicUser(account: User) {
  return {
    id: account.id,
    email: account.email,
    firstname: account.firstname,
    lastname: account.lastname,
    role: account.role,
    isActive: account.isActive,
    mustChangePassword: account.mustChangePassword,
  };
}

export function expectAuthResponse(
  responseBody: Record<string, unknown>,
  expectedUser: ReturnType<typeof expectedPublicUser>,
) {
  expect(Object.keys(responseBody).sort()).toEqual(
    ["accessToken", "expiresIn", "user"].sort(),
  );
  expect(typeof responseBody.accessToken).toBe("string");
  expect(responseBody.expiresIn).toBe(config.accessTokenTtlSeconds);
  expect(responseBody.user).toEqual(expectedUser);
}
