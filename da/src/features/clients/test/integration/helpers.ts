import { expect } from "bun:test";
import { createApp } from "../../../../appFactory";
import { DataProtector } from "../../../../shared/crypto/DataProtector";
import type { Mailer } from "../../../../shared/mail/Mailer";
import type { HtmlToPdfRenderer } from "../../../../shared/pdf/GotenbergPdfRenderer";
import { createTestDatabase } from "../../../../tests-helpers/testDatabase";
import { createTestRequest } from "../../../../tests-helpers/testRequest";
import { loadAuthConfig } from "../../../auth/config";
import {
  DrizzleRefreshSessionRepository,
  DrizzleUserRepository,
} from "../../../auth/infrastructure/DrizzleAuthRepositories";
import { BcryptPasswordHasher } from "../../../auth/password";
import type { User } from "../../../auth/types";
import { DrizzleBillingEmailLog } from "../../../billing/email/DrizzleBillingEmailLog";
import { DrizzleBillingDocumentRepository } from "../../../billing/infrastructure/DrizzleBillingDocumentRepository";
import { DrizzleClientRepository } from "../../infrastructure/DrizzleClientRepository";

const config = loadAuthConfig({
  JWT_SECRET: "i".repeat(32),
  SPA_APP_ID: "clients-integration-spa",
  BCRYPT_ROUNDS: "4",
});

export function createClientIntegrationFixture(
  name: string,
  options: { mailer?: Mailer; pdfRenderer?: HtmlToPdfRenderer } = {},
) {
  const database = createTestDatabase(name);
  expect(database.sqlite.query("PRAGMA journal_mode").get()).toEqual({
    journal_mode: "wal",
  });
  const protector = new DataProtector(Buffer.alloc(32, 31));
  const users = new DrizzleUserRepository(database.database, protector);
  const sessions = new DrizzleRefreshSessionRepository(database.database);
  const clients = new DrizzleClientRepository(database.database, protector);
  const billingDocuments = new DrizzleBillingDocumentRepository(
    database.database,
    protector,
    clients,
  );
  const passwords = new BcryptPasswordHasher(config.bcryptRounds);
  const app = createApp(config, {
    users,
    sessions,
    passwords,
    clients,
    billingDocuments,
    billingEmails: new DrizzleBillingEmailLog(database.database),
    mailer: options.mailer,
    pdfRenderer: options.pdfRenderer,
  });
  const request = createTestRequest(app, config.appId);
  let admin!: User;
  let subadmin!: User;

  const fixture = {
    app,
    database,
    users,
    clients,
    billingDocuments,
    get admin() {
      return admin;
    },
    get subadmin() {
      return subadmin;
    },
    headers(extra: Record<string, string> = {}): HeadersInit {
      return { "X-App-Id": config.appId, ...extra };
    },
    async reset() {
      database.sqlite.run(
        `DELETE FROM billing_lines;
         DELETE FROM billing_documents;
         DELETE FROM client_search_trigrams;
         DELETE FROM clients;
         DELETE FROM refresh_sessions;
         DELETE FROM users;
         DELETE FROM sqlite_sequence WHERE name IN ('clients', 'users');`,
      );
      const now = Date.now();
      const passwordHash = await passwords.hash("integration-password");
      admin = await users.create({
        email: "clients-admin@example.com",
        firstname: "Client",
        lastname: "Admin",
        passwordHash,
        role: "Admin",
        isActive: true,
        mustChangePassword: false,
        lastLoginAtEpochMs: null,
        createdAtEpochMs: now,
        updatedAtEpochMs: now,
      });
      subadmin = await users.create({
        email: "clients-subadmin@example.com",
        firstname: "Client",
        lastname: "Subadmin",
        passwordHash,
        role: "Subadmin",
        isActive: true,
        mustChangePassword: false,
        lastLoginAtEpochMs: null,
        createdAtEpochMs: now,
        updatedAtEpochMs: now,
      });
    },
    login(user: User = admin) {
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
    request,
    cleanup() {
      database.cleanup();
    },
  };
  return fixture;
}

export type ClientIntegrationFixture = ReturnType<
  typeof createClientIntegrationFixture
>;
