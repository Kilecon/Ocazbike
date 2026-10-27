import type { Database } from "bun:sqlite";
import type { ClientDataProtector } from "../clients/crypto/ClientDataProtector";

interface StoredUserRow {
  id: number;
  email: string;
  firstname: string;
  lastname: string;
  encryption_salt: string;
}

export function migrateUserData(
  sqlite: Database,
  protector: ClientDataProtector,
): void {
  const migrate = sqlite.transaction(() => {
    const rows = sqlite
      .query(
        `SELECT id, email, firstname, lastname, encryption_salt
       FROM users
       ORDER BY id`,
      )
      .all() as StoredUserRow[];
    const updateUser = sqlite.query(
      `UPDATE users
       SET email = ?, firstname = ?, lastname = ?, encryption_salt = ?
       WHERE id = ?`,
    );

    for (const row of rows) {
      if (!row.encryption_salt) {
        const salt = protector.createSalt();
        const normalizedEmail = normalizeEmail(row.email);
        const encryptedEmail = protector.encrypt(normalizedEmail, salt);
        if (encryptedEmail === null)
          throw new Error(`User ${row.id} has no email`);
        const encryptedFirstname = protector.encrypt(row.firstname, salt);
        const encryptedLastname = protector.encrypt(row.lastname, salt);
        if (encryptedFirstname === null || encryptedLastname === null) {
          throw new Error(`User ${row.id} has incomplete personal data`);
        }
        updateUser.run(
          encryptedEmail,
          encryptedFirstname,
          encryptedLastname,
          salt.toString("base64url"),
          row.id,
        );
      } else {
        const email = protector.decrypt(row.email, row.encryption_salt);
        const firstname = decryptOrLegacyPlaintext(
          row.firstname,
          row.encryption_salt,
          protector,
        );
        const lastname = decryptOrLegacyPlaintext(
          row.lastname,
          row.encryption_salt,
          protector,
        );
        if (email === null || firstname === null || lastname === null) {
          throw new Error(
            `User ${row.id} has incomplete encrypted personal data`,
          );
        }
        updateUser.run(
          row.email,
          protector.encrypt(
            firstname,
            Buffer.from(row.encryption_salt, "base64url"),
          ),
          protector.encrypt(
            lastname,
            Buffer.from(row.encryption_salt, "base64url"),
          ),
          row.encryption_salt,
          row.id,
        );
      }
    }

    sqlite.exec(
      "CREATE UNIQUE INDEX IF NOT EXISTS users_encryption_salt_unique ON users (encryption_salt)",
    );

    const migratedRows = sqlite
      .query(
        "SELECT id, email, firstname, lastname, encryption_salt FROM users",
      )
      .all() as StoredUserRow[];
    for (const row of migratedRows) {
      const email = protector.decrypt(row.email, row.encryption_salt);
      const firstname = protector.decrypt(row.firstname, row.encryption_salt);
      const lastname = protector.decrypt(row.lastname, row.encryption_salt);
      if (email === null || firstname === null || lastname === null) {
        throw new Error(
          `User ${row.id} could not be verified after encryption`,
        );
      }
      sqlite
        .query("UPDATE users SET email_lookup_hash = ? WHERE id = ?")
        .run(protector.emailLookupHash(email), row.id);
    }
  });

  migrate();
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function decryptOrLegacyPlaintext(
  value: string,
  salt: string,
  protector: ClientDataProtector,
): string {
  if (!value.startsWith("v1.")) return value;
  const decrypted = protector.decrypt(value, salt);
  if (decrypted === null) throw new Error("User personal data cannot be null");
  return decrypted;
}
