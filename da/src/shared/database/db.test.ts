import { describe, expect, it } from "bun:test";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { createTestDatabase } from "../../test-support/testDatabase";
import { migrateDatabase, openDatabase, resolveDatabasePath } from "./db";

describe("test database isolation", () => {
  it("applies the complete initial schema once and preserves data on reruns", () => {
    const database = createTestDatabase("database-initial-schema");
    try {
      database.sqlite.run(
        "INSERT INTO support_daily_sequences (date, last_number) VALUES ('2026-01-01', 7)",
      );
      migrateDatabase(database.database);
      expect(
        database.sqlite
          .query("SELECT count(*) AS total FROM __drizzle_migrations")
          .get(),
      ).toEqual({ total: 1 });
      expect(
        database.sqlite.query("SELECT * FROM support_daily_sequences").all(),
      ).toEqual([{ date: "2026-01-01", last_number: 7 }]);
      expect(
        database.sqlite
          .query(
            "SELECT name FROM sqlite_master WHERE type = 'trigger' ORDER BY name",
          )
          .all(),
      ).toEqual([
        { name: "billing_invoices_content_immutable" },
        { name: "billing_legacy_content_immutable" },
        { name: "billing_quotes_content_immutable" },
      ]);
      expect(database.sqlite.query("PRAGMA foreign_key_check").all()).toEqual(
        [],
      );
    } finally {
      database.cleanup();
    }
  });

  it.each([1, Number.MAX_SAFE_INTEGER])(
    "rejects an old migration history dated %s before modifying its database",
    (timestamp) => {
      const { db, sqlite } = openDatabase(":memory:");
      try {
        sqlite.run(
          "CREATE TABLE __drizzle_migrations (id INTEGER PRIMARY KEY, hash TEXT NOT NULL, created_at NUMERIC); " +
            "CREATE TABLE preserved_data (value TEXT); " +
            "INSERT INTO preserved_data VALUES ('keep');",
        );
        sqlite
          .query(
            "INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)",
          )
          .run("old-initial-schema-hash", timestamp);
        const before = sqlite
          .query("SELECT name, sql FROM sqlite_master ORDER BY name")
          .all();
        expect(() => migrateDatabase(db)).toThrow(
          "Database migration history is incompatible",
        );
        expect(
          sqlite
            .query("SELECT name, sql FROM sqlite_master ORDER BY name")
            .all(),
        ).toEqual(before);
        expect(sqlite.query("SELECT * FROM preserved_data").all()).toEqual([
          { value: "keep" },
        ]);
        expect(
          sqlite
            .query("SELECT hash, created_at FROM __drizzle_migrations")
            .all(),
        ).toEqual([{ hash: "old-initial-schema-hash", created_at: timestamp }]);
      } finally {
        sqlite.close();
      }
    },
  );

  it("refuses to resolve the configured database in the test environment", () => {
    expect(() =>
      resolveDatabasePath({ NODE_ENV: "test", SQLITE_DB_PATH: "/tmp/x.db" }),
    ).toThrow("createTestDatabase");
    expect(
      resolveDatabasePath({ NODE_ENV: "production", SQLITE_DB_PATH: "a.db" }),
    ).toBe("a.db");
    expect(resolveDatabasePath({})).toBe("./data/elysia.sqlite");
  });

  it("has no side effects on import and creates parent folders when opened", () => {
    const directory = mkdtempSync(join(tmpdir(), "database-open-"));
    const path = join(directory, "nested", "app.sqlite");
    try {
      const result = Bun.spawnSync(
        [
          process.execPath,
          "-e",
          'import "./src/shared/database/db"; console.log("imported");',
        ],
        {
          cwd: resolve(import.meta.dir, "../../.."),
          env: { ...process.env, NODE_ENV: "production", SQLITE_DB_PATH: path },
        },
      );
      expect(result.exitCode).toBe(0);
      expect(existsSync(path)).toBe(false);

      const { sqlite } = openDatabase(path);
      try {
        expect(sqlite.query("PRAGMA journal_mode").get()).toEqual({
          journal_mode: "wal",
        });
        expect(sqlite.query("PRAGMA foreign_keys").get()).toEqual({
          foreign_keys: 1,
        });
      } finally {
        sqlite.close();
      }
      expect(existsSync(path)).toBe(true);
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
        first.sqlite.run("CREATE TABLE isolation_marker (id INTEGER)");
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
        "billing_documents_client_type_date_ms_idx",
      );
      expect(indexNames("billing_documents")).not.toContain(
        "billing_documents_client_id_idx",
      );
      const clientPlan = (
        database.sqlite
          .query(
            "EXPLAIN QUERY PLAN SELECT id FROM billing_documents WHERE client_id = ? AND type = ? ORDER BY date_ms DESC, id DESC LIMIT 10",
          )
          .all(1, "repair") as { detail: string }[]
      ).map(({ detail }) => detail);
      expect(clientPlan).toEqual([
        "SEARCH billing_documents USING COVERING INDEX billing_documents_client_type_date_ms_idx (client_id=? AND type=?)",
      ]);
      expect(indexNames("billing_documents")).toContain(
        "billing_documents_status_type_idx",
      );
      const countPlan = (
        database.sqlite
          .query(
            "EXPLAIN QUERY PLAN SELECT type, status, count(*) FROM billing_documents WHERE status IN (?, ?, ?) GROUP BY status, type",
          )
          .all("pending", "in_progress", "payment_pending") as {
          detail: string;
        }[]
      )
        .map(({ detail }) => detail)
        .join(" | ");
      expect(countPlan).toContain(
        "USING COVERING INDEX billing_documents_status_type_idx",
      );
      expect(countPlan).not.toContain("TEMP B-TREE");
      expect(indexNames("billing_documents")).toContain(
        "billing_documents_type_date_ms_idx",
      );
      expect(indexNames("billing_documents")).toContain(
        "billing_documents_status_date_ms_idx",
      );
      expect(indexNames("billing_documents")).toContain(
        "billing_documents_type_status_date_ms_idx",
      );
      expect(indexNames("billing_document_snapshots")).toContain(
        "billing_document_snapshots_document_kind_unique",
      );
      expect(indexNames("billing_quotes")).toContain(
        "billing_quotes_document_unique",
      );
      expect(indexNames("billing_invoices")).toContain(
        "billing_invoices_document_unique",
      );
      expect(indexNames("billing_lines")).toContain(
        "billing_lines_billing_document_id_idx",
      );
      expect(indexNames("users")).not.toContain("users_created_at_ms_idx");
      expect(indexNames("users")).not.toContain("users_updated_at_ms_idx");
      expect(indexNames("users")).not.toContain("users_last_login_at_ms_idx");

      for (const where of [
        "",
        "WHERE status = 'created'",
        "WHERE type = 'BUG'",
        "WHERE type = 'BUG' AND status = 'created'",
      ]) {
        const plan = (
          database.sqlite
            .query(
              `EXPLAIN QUERY PLAN SELECT * FROM support_requests ${where}
               ORDER BY created_at DESC, id DESC LIMIT 10`,
            )
            .all() as { detail: string }[]
        )
          .map(({ detail }) => detail)
          .join(" | ");
        expect(plan).toContain("USING INDEX support_requests_");
        expect(plan).not.toContain("TEMP B-TREE");
      }
    } finally {
      database.cleanup();
    }
  });
});
