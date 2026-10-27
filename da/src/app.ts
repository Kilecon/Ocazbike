import { createApp } from "./appFactory";
import { ensureBootstrapAdmin } from "./features/auth/bootstrapAdmin";
import { loadAuthConfig } from "./features/auth/config";
import {
  DrizzleRefreshSessionRepository,
  DrizzleUserRepository,
} from "./features/auth/infrastructure/DrizzleAuthRepositories";
import { migrateUserData } from "./features/auth/migrateUserData";
import { BcryptPasswordHasher } from "./features/auth/password";
import { DrizzleBillingDocumentRepository } from "./features/billing/infrastructure/DrizzleBillingDocumentRepository";
import { ClientDataProtector } from "./features/clients/crypto/ClientDataProtector";
import { migrateClientData } from "./features/clients/crypto/migrateClientData";
import { DrizzleClientRepository } from "./features/clients/infrastructure/DrizzleClientRepository";
import { migrateSupportRequestData } from "./features/support/crypto/migrateSupportRequestData";
import { DrizzleSupportRequestRepository } from "./features/support/infrastructure/DrizzleSupportRequestRepository";
import { db, sqlite } from "./shared/database/db";
import { logger } from "./shared/observability/logger";

const config = loadAuthConfig();
const clientDataProtector = ClientDataProtector.fromEnvironment();
migrateClientData(sqlite, clientDataProtector);
migrateUserData(sqlite, clientDataProtector);
migrateSupportRequestData(sqlite, clientDataProtector);
const users = new DrizzleUserRepository(db, clientDataProtector);
await ensureBootstrapAdmin(users);

const sessions = new DrizzleRefreshSessionRepository(db);
const PURGE_INTERVAL_MS = 60 * 60 * 1000;
const purgeExpiredSessions = () =>
  sessions.deleteExpired().catch((error) => logger.error(error));
await purgeExpiredSessions();
setInterval(purgeExpiredSessions, PURGE_INTERVAL_MS).unref();

export const app = createApp(config, {
  users,
  sessions,
  passwords: new BcryptPasswordHasher(config.bcryptRounds),
  billingDocuments: new DrizzleBillingDocumentRepository(
    db,
    clientDataProtector,
  ),
  clients: new DrizzleClientRepository(db, clientDataProtector),
  supportRequests: new DrizzleSupportRequestRepository(db, clientDataProtector),
  clientDataProtector,
});
