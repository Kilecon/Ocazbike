import { expect } from "bun:test";
import { createApp } from "../../../../appFactory";
import { createTestDatabase } from "../../../../shared/database/testDatabase";
import { loadAuthConfig } from "../../../auth/config";
import {
  DrizzleRefreshSessionRepository,
  DrizzleUserRepository,
} from "../../../auth/infrastructure/DrizzleAuthRepositories";
import { BcryptPasswordHasher } from "../../../auth/password";
import type { User } from "../../../auth/types";
import { ClientDataProtector } from "../../../clients/crypto/ClientDataProtector";
import { migrateSupportRequestData } from "../../crypto/migrateSupportRequestData";
import type {
  SupportNotifier,
  SupportRequestRecord,
} from "../../ISupportRequestRepository";
import { DrizzleSupportRequestRepository } from "../../infrastructure/DrizzleSupportRequestRepository";

const config = loadAuthConfig({
  JWT_SECRET: "support-integration-test-secret-0123456789",
  SPA_APP_ID: "support-integration-spa",
  BCRYPT_ROUNDS: "4",
});

export function createSupportIntegrationFixture(name: string) {
  const database = createTestDatabase(name);
  expect(database.sqlite.query("PRAGMA journal_mode").get()).toEqual({
    journal_mode: "wal",
  });
  const protector = new ClientDataProtector(Buffer.alloc(32, 42));
  migrateSupportRequestData(database.sqlite, protector);
  const users = new DrizzleUserRepository(database.database, protector);
  const sessions = new DrizzleRefreshSessionRepository(database.database);
  const supportRequests = new DrizzleSupportRequestRepository(
    database.database,
    protector,
  );
  const passwords = new BcryptPasswordHasher(config.bcryptRounds);
  const notifications: SupportRequestRecord[] = [];
  let notificationFails = false;
  const notifier: SupportNotifier = {
    async notify(request) {
      if (notificationFails) throw new Error("Discord unavailable in test");
      notifications.push(request);
    },
  };
  const app = createApp(config, {
    users,
    sessions,
    passwords,
    supportRequests,
    supportNotifier: notifier,
  });
  let admin!: User;
  let subadmin!: User;
  let inactiveAdmin!: User;

  const fixture = {
    app,
    database,
    users,
    supportRequests,
    notifications,
    get admin() {
      return admin;
    },
    get subadmin() {
      return subadmin;
    },
    get inactiveAdmin() {
      return inactiveAdmin;
    },
    setNotificationFailure(fails: boolean) {
      notificationFails = fails;
    },
    headers(extra: Record<string, string> = {}): HeadersInit {
      return { "X-App-Id": config.appId, ...extra };
    },
    request(path: string, init: RequestInit = {}) {
      const headers = new Headers(fixture.headers());
      new Headers(init.headers).forEach((value, key) => {
        headers.set(key, value);
      });
      if (init.body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }
      return app.handle(
        new Request(`http://localhost${path}`, { ...init, headers }),
      );
    },
    async login(user: User = admin) {
      return fixture.request("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: user.email,
          password: "support-integration-password",
        }),
      });
    },
    async reset() {
      database.sqlite.exec(
        `DELETE FROM support_requests;
         DELETE FROM support_daily_sequences;
         DELETE FROM refresh_sessions;
         DELETE FROM users;
         DELETE FROM sqlite_sequence WHERE name = 'users';`,
      );
      const now = Date.now();
      const passwordHash = await passwords.hash("support-integration-password");
      const makeAccount = (
        email: string,
        role: User["role"],
        isActive: boolean,
      ) =>
        users.create({
          email,
          firstname: "Support",
          lastname: role,
          passwordHash,
          role,
          isActive,
          mustChangePassword: false,
          lastLoginAtEpochMs: null,
          createdAtEpochMs: now,
          updatedAtEpochMs: now,
        });
      admin = await makeAccount("support-admin@example.test", "Admin", true);
      subadmin = await makeAccount(
        "support-subadmin@example.test",
        "Subadmin",
        true,
      );
      inactiveAdmin = await makeAccount(
        "support-inactive@example.test",
        "Admin",
        false,
      );
      notifications.length = 0;
      notificationFails = false;
    },
    cleanup() {
      database.cleanup();
    },
  };

  return fixture;
}

export type SupportIntegrationFixture = ReturnType<
  typeof createSupportIntegrationFixture
>;
