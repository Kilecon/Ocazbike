import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrateDatabase, openDatabase } from "../shared/database/db";

/** Creates an isolated, migrated SQLite database removed by cleanup(). */
export function createTestDatabase(name: string) {
  const directory = mkdtempSync(join(tmpdir(), `${name}-`));
  const path = join(directory, "test.sqlite");
  const { sqlite, db: database } = openDatabase(path);
  const cleanup = () => {
    try {
      sqlite.close();
    } finally {
      rmSync(directory, {
        recursive: true,
        force: true,
        maxRetries: 5,
        retryDelay: 100,
      });
    }
  };

  try {
    migrateDatabase(database);
  } catch (error) {
    cleanup();
    throw error;
  }

  return { database, sqlite, path, cleanup };
}
