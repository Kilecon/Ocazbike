import { createApp } from "./appFactory";
import { ensureBootstrapAdmin } from "./features/auth/bootstrapAdmin";
import { loadAuthConfig } from "./features/auth/config";
import {
  DrizzleRefreshSessionRepository,
  DrizzleUserRepository,
} from "./features/auth/infrastructure/DrizzleAuthRepositories";
import { BcryptPasswordHasher } from "./features/auth/password";
import { DrizzleBillingEmailLog } from "./features/billing/email/DrizzleBillingEmailLog";
import { DrizzleBillingDocumentRepository } from "./features/billing/infrastructure/DrizzleBillingDocumentRepository";
import { DrizzleClientRepository } from "./features/clients/infrastructure/DrizzleClientRepository";
import { DrizzleStoreInformationRepository } from "./features/store-information/infrastructure/DrizzleStoreInformationRepository";
import { DiscordSupportNotifier } from "./features/support/infrastructure/DiscordSupportNotifier";
import { DrizzleSupportRequestRepository } from "./features/support/infrastructure/DrizzleSupportRequestRepository";
import { prepareDatabase } from "./prepareDatabase";
import { loadRuntimeEnvironment } from "./shared/config/secrets";
import { DataProtector } from "./shared/crypto/DataProtector";
import { createMailer } from "./shared/mail/SmtpMailer";
import { logger } from "./shared/observability/logger";
import { GotenbergPdfRenderer } from "./shared/pdf/GotenbergPdfRenderer";

const PURGE_INTERVAL_MS = 60 * 60 * 1000;

export async function createServerApp() {
  const env = loadRuntimeEnvironment();
  const config = loadAuthConfig(env);
  const dataProtector = DataProtector.fromEnvironment(env.ENCRYPTION_KEY);
  const { db, sqlite } = await prepareDatabase(env);

  const users = new DrizzleUserRepository(db, dataProtector);
  const passwords = new BcryptPasswordHasher(config.bcryptRounds);
  await ensureBootstrapAdmin(users, passwords, env);

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
    billingEmails: new DrizzleBillingEmailLog(db),
    mailer: createMailer(env),
    pdfRenderer: new GotenbergPdfRenderer(env.GOTENBERG_URL),
    clients,
    supportRequests: new DrizzleSupportRequestRepository(db, dataProtector),
    supportNotifier: new DiscordSupportNotifier(env.DISCORD_WEBHOOK_URL ?? ""),
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
