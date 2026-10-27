import { Database } from "bun:sqlite";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import * as authSchema from "./schema/auth";
import * as billingSchema from "./schema/billing";
import * as supportSchema from "./schema/support";

const testDirectory =
  process.env.NODE_ENV === "test"
    ? mkdtempSync(join(tmpdir(), "elysia-test-"))
    : null;
const databasePath = testDirectory
  ? join(testDirectory, "elysia.sqlite")
  : (process.env.SQLITE_DB_PATH ?? "./data/elysia.sqlite");

if (databasePath !== ":memory:") {
  const absolutePath = resolve(databasePath);
  mkdirSync(dirname(absolutePath), { recursive: true });
}

export const sqlite = new Database(databasePath);
if (testDirectory) {
  process.once("exit", () => {
    sqlite.close();
    rmSync(testDirectory, { recursive: true, force: true });
  });
}
sqlite.run("PRAGMA journal_mode = WAL");
sqlite.run("PRAGMA busy_timeout = 1000");
sqlite.run("PRAGMA foreign_keys = ON");

export const db = drizzle(sqlite, {
  schema: { ...authSchema, ...billingSchema, ...supportSchema },
});

const legacyLookupColumn = (
  sqlite.query("PRAGMA table_info(users)").all() as {
    name: string;
    notnull: number;
  }[]
).find((column) => column.name === "email_lookup_hash" && column.notnull === 1);
if (legacyLookupColumn) {
  sqlite.run("DROP INDEX IF EXISTS users_email_lookup_hash_unique");
  sqlite.run("ALTER TABLE users DROP COLUMN email_lookup_hash");
}

migrate(db, { migrationsFolder: "./drizzle" });

export type AppDatabase = typeof db;

export { authSchema, billingSchema, supportSchema };
