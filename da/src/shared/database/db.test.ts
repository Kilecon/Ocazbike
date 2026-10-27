import { describe, expect, it } from "bun:test";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { createTestDatabase } from "./testDatabase";

describe("test database isolation", () => {
  it.each([
    { name: "test environment guard", nodeEnv: "test", preload: "" },
    {
      name: "test preload with a development environment",
      nodeEnv: "development",
      preload: 'import "./src/shared/database/testSetup";',
    },
  ])("never opens the configured database: $name", ({ nodeEnv, preload }) => {
    const directory = mkdtempSync(join(tmpdir(), "database-isolation-"));
    const configuredPath = join(directory, "must-not-be-created.sqlite");
    try {
      const result = Bun.spawnSync(
        [
          process.execPath,
          "-e",
          `${preload}
          import { sqlite } from "./src/shared/database/db";
          import { existsSync } from "node:fs";
          const databasePath = sqlite.query("PRAGMA database_list").get().file;
          console.log(JSON.stringify({
            databasePath,
            exists: existsSync(databasePath),
            databases: sqlite.query("PRAGMA database_list").all(),
          }));`,
        ],
        {
          cwd: resolve(import.meta.dir, "../../.."),
          env: {
            ...process.env,
            NODE_ENV: nodeEnv,
            SQLITE_DB_PATH: configuredPath,
          },
        },
      );
      expect(result.stderr.toString()).toBe("");
      expect(result.exitCode).toBe(0);
      const { databasePath, exists, databases } = JSON.parse(
        result.stdout.toString(),
      );
      expect(databasePath).not.toBe(configuredPath);
      expect(exists).toBe(true);
      expect(databases).toContainEqual({
        seq: 0,
        name: "main",
        file: databasePath,
      });
      expect(existsSync(configuredPath)).toBe(false);
      expect(existsSync(databasePath)).toBe(false);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("gives each suite an independent migrated database and cleans it up", () => {
    const first = createTestDatabase("database-isolation-first");
    try {
      const second = createTestDatabase("database-isolation-second");
      try {
        expect(first.path).not.toBe(second.path);
        expect(first.sqlite.query("PRAGMA journal_mode").get()).toEqual({
          journal_mode: "wal",
        });
        first.sqlite.exec("CREATE TABLE isolation_marker (id INTEGER)");
        expect(
          second.sqlite
            .query(
              "SELECT name FROM sqlite_master WHERE name = 'isolation_marker'",
            )
            .get(),
        ).toBeNull();
        expect(
          second.sqlite
            .query("SELECT name FROM sqlite_master WHERE name = 'clients'")
            .get(),
        ).not.toBeNull();
      } finally {
        second.cleanup();
      }
      expect(existsSync(second.path)).toBe(false);
      expect(existsSync(dirname(second.path))).toBe(false);
    } finally {
      first.cleanup();
    }
    expect(existsSync(first.path)).toBe(false);
    expect(existsSync(dirname(first.path))).toBe(false);
  });

  it("keeps query and foreign-key indexes while omitting unused user date indexes", () => {
    const database = createTestDatabase("database-indexes");
    try {
      const indexNames = (table: string) =>
        (
          database.sqlite.query(`PRAGMA index_list('${table}')`).all() as {
            name: string;
          }[]
        ).map(({ name }) => name);

      expect(indexNames("billing_documents")).toContain(
        "billing_documents_client_id_idx",
      );
      expect(indexNames("billing_lines")).toContain(
        "billing_lines_billing_document_id_idx",
      );
      expect(indexNames("users")).not.toContain("users_created_at_ms_idx");
      expect(indexNames("users")).not.toContain("users_updated_at_ms_idx");
      expect(indexNames("users")).not.toContain("users_last_login_at_ms_idx");
    } finally {
      database.cleanup();
    }
  });
});
