import { createApp } from "./appFactory";
import { ensureBootstrapAdmin } from "./features/auth/bootstrapAdmin";
import { loadAuthConfig } from "./features/auth/config";
import {
  DrizzleRefreshSessionRepository,
  DrizzleUserRepository,
} from "./features/auth/infrastructure/DrizzleAuthRepositories";
import { BcryptPasswordHasher } from "./features/auth/password";
import { DrizzleBillingDocumentRepository } from "./features/billing/infrastructure/DrizzleBillingDocumentRepository";
import { DrizzleClientRepository } from "./features/clients/infrastructure/DrizzleClientRepository";
import { DrizzleStoreInformationRepository } from "./features/store-information/infrastructure/DrizzleStoreInformationRepository";
import { DrizzleSupportRequestRepository } from "./features/support/infrastructure/DrizzleSupportRequestRepository";
import { prepareDatabase } from "./prepareDatabase";
import { DataProtector } from "./shared/crypto/DataProtector";
import { logger } from "./shared/observability/logger";

const PURGE_INTERVAL_MS = 60 * 60 * 1000;

export async function createServerApp() {
  const config = loadAuthConfig();
  const dataProtector = DataProtector.fromEnvironment();
  const { db, sqlite } = await prepareDatabase();

  const users = new DrizzleUserRepository(db, dataProtector);
  const passwords = new BcryptPasswordHasher(config.bcryptRounds);
  await ensureBootstrapAdmin(users, passwords);

  const sessions = new DrizzleRefreshSessionRepository(db);
  const purgeExpiredSessions = () =>
    sessions.deleteExpired().catch((error) => logger.error(error));
  await purgeExpiredSessions();
  const purgeTimer = setInterval(purgeExpiredSessions, PURGE_INTERVAL_MS);
  purgeTimer.unref();

  const clients = new DrizzleClientRepository(db, dataProtector);
  const app = createApp(config, {
    users,
    sessions,
    passwords,
    billingDocuments: new DrizzleBillingDocumentRepository(
      db,
      dataProtector,
      clients,
    ),
    clients,
    supportRequests: new DrizzleSupportRequestRepository(db, dataProtector),
    storeInformation: new DrizzleStoreInformationRepository(db, dataProtector),
  });

  return {
    app,
    close() {
      clearInterval(purgeTimer);
      sqlite.close();
    },
  };
}
