import { seedInitialStoreInformation } from "./features/store-information/seedInitialStoreInformation";
import { DataProtector } from "./shared/crypto/DataProtector";
import {
  type DatabaseConnection,
  migrateDatabase,
  openDatabase,
  resolveDatabasePath,
} from "./shared/database/db";

/** Opens, migrates and seeds the configured database. */
export async function prepareDatabase(
  env: Record<string, string | undefined> = process.env,
): Promise<DatabaseConnection> {
  const connection = openDatabase(resolveDatabasePath(env));
  migrateDatabase(connection.db);
  if (env.STORE_INFORMATION_INITIAL_DATA?.trim()) {
    await seedInitialStoreInformation(
      connection.db,
      DataProtector.fromEnvironment(env.ENCRYPTION_KEY),
      env.STORE_INFORMATION_INITIAL_DATA,
    );
  }
  return connection;
}
