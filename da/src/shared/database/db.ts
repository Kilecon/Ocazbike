import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { readMigrationFiles } from "drizzle-orm/migrator";
import * as authSchema from "./schema/auth";
import * as billingSchema from "./schema/billing";
import * as storeInformationSchema from "./schema/storeInformation";
import * as supportSchema from "./schema/support";

const schema = {
  ...authSchema,
  ...billingSchema,
  ...supportSchema,
  ...storeInformationSchema,
};

export const MIGRATIONS_FOLDER = resolve(import.meta.dir, "../../../drizzle");

export type AppDatabase = ReturnType<typeof drizzle<typeof schema>>;

export interface DatabaseConnection {
  sqlite: Database;
  db: AppDatabase;
}

export function resolveDatabasePath(
  env: Record<string, string | undefined> = process.env,
): string {
  if (env.NODE_ENV === "test") {
    throw new Error(
      "Tests must use createTestDatabase() instead of the configured database",
    );
  }
  return env.SQLITE_DB_PATH ?? "./data/elysia.sqlite";
}

export function openDatabase(path: string): DatabaseConnection {
  if (path !== ":memory:") {
    mkdirSync(dirname(resolve(path)), { recursive: true });
  }

  const sqlite = new Database(path);
  sqlite.run("PRAGMA journal_mode = WAL");
  sqlite.run("PRAGMA busy_timeout = 1000");
  sqlite.run("PRAGMA foreign_keys = ON");

  return { sqlite, db: drizzle(sqlite, { schema }) };
}

export function migrateDatabase(
  database: AppDatabase,
  migrationsFolder = MIGRATIONS_FOLDER,
): void {
  const journal = database.get<[string]>(
    sql`SELECT name FROM sqlite_master WHERE type = 'table' AND name = '__drizzle_migrations'`,
  );
  if (journal) {
    const firstApplied = database.get<[string]>(
      sql`SELECT hash FROM __drizzle_migrations ORDER BY created_at ASC LIMIT 1`,
    );
    const initial = readMigrationFiles({ migrationsFolder })[0];
    if (firstApplied && firstApplied[0] !== initial?.hash) {
      throw new Error(
        "Database migration history is incompatible with the consolidated initial schema. " +
          "The existing database has not been modified. Use SQLITE_DB_PATH with a new database, " +
          "or perform a separate, backed-up data migration before starting the application.",
      );
    }
  }
  migrate(database, { migrationsFolder });
}

export { authSchema, billingSchema, storeInformationSchema, supportSchema };
