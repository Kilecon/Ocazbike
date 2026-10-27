import { Database } from "bun:sqlite";
import { afterEach, describe, expect, it } from "bun:test";
import { ClientDataProtector } from "../clients/crypto/ClientDataProtector";
import { migrateUserData } from "./migrateUserData";

describe("user data encryption migration", () => {
  const sqlite = new Database(":memory:");
  const protector = new ClientDataProtector(Buffer.alloc(32, 11));

  afterEach(() => sqlite.close());

  it("encrypts legacy emails and personal names with a unique salt", () => {
    sqlite.run(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY,
        email TEXT NOT NULL,
        firstname TEXT NOT NULL DEFAULT '',
        lastname TEXT NOT NULL DEFAULT '',
        encryption_salt TEXT NOT NULL DEFAULT '',
        email_lookup_hash TEXT
      );
      INSERT INTO users (id, email, firstname, lastname)
      VALUES (1, 'Admin@Example.com ', 'Admin', 'Example');
    `);

    migrateUserData(sqlite, protector);

    const row = sqlite
      .query(
        "SELECT email, firstname, lastname, encryption_salt FROM users WHERE id = 1",
      )
      .get() as {
      email: string;
      firstname: string;
      lastname: string;
      encryption_salt: string;
    };
    expect(row.email).not.toContain("Admin@Example.com");
    expect(protector.decrypt(row.email, row.encryption_salt)).toBe(
      "admin@example.com",
    );
    expect(protector.decrypt(row.firstname, row.encryption_salt)).toBe("Admin");
    expect(protector.decrypt(row.lastname, row.encryption_salt)).toBe(
      "Example",
    );
    expect(row.encryption_salt).toHaveLength(43);
    const hashed = sqlite
      .query("SELECT email_lookup_hash FROM users WHERE id = 1")
      .get() as { email_lookup_hash: string };
    expect(hashed.email_lookup_hash).toBe(
      protector.emailLookupHash("admin@example.com"),
    );

    expect(() =>
      sqlite
        .query(
          "INSERT INTO users (id, email, firstname, lastname, encryption_salt) VALUES (2, ?, ?, ?, ?)",
        )
        .run(row.email, row.firstname, row.lastname, row.encryption_salt),
    ).toThrow();
  });
});
