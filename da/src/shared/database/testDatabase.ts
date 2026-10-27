import { Database } from "bun:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import * as authSchema from "./schema/auth";
import * as billingSchema from "./schema/billing";
import * as supportSchema from "./schema/support";

export function createTestDatabase(name: string) {
  const directory = mkdtempSync(join(tmpdir(), `${name}-`));
  const path = join(directory, "test.sqlite");
  const sqlite = new Database(path);
  sqlite.run("PRAGMA journal_mode = WAL");
  sqlite.run("PRAGMA busy_timeout = 1000");
  sqlite.run("PRAGMA foreign_keys = ON");

  const database = drizzle(sqlite, {
    schema: { ...authSchema, ...billingSchema, ...supportSchema },
  });
  try {
    migrate(database, {
      migrationsFolder: resolve(import.meta.dir, "../../../drizzle"),
    });
  } catch (error) {
    sqlite.close();
    rmSync(directory, { recursive: true, force: true });
    throw error;
  }

  return {
    database,
    sqlite,
    path,
    cleanup() {
      try {
        sqlite.close();
      } finally {
        rmSync(directory, { recursive: true, force: true });
      }
    },
  };
}
