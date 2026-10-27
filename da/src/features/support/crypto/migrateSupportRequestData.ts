import type { Database } from "bun:sqlite";
import type { ClientDataProtector } from "../../clients/crypto/ClientDataProtector";

interface StoredSupportRequest {
  id: number;
  title: string;
  description: string;
  encryption_salt: string | null;
}

export function migrateSupportRequestData(
  sqlite: Database,
  protector: ClientDataProtector,
): void {
  const migrate = sqlite.transaction(() => {
    const rows = sqlite
      .query(
        `SELECT id, title, description, encryption_salt
         FROM support_requests
         WHERE encryption_salt IS NULL`,
      )
      .all() as StoredSupportRequest[];
    const updateRequest = sqlite.query(
      `UPDATE support_requests
       SET title = ?, description = ?, encryption_salt = ?
       WHERE id = ?`,
    );

    for (const row of rows) {
      const salt = protector.createSalt();
      updateRequest.run(
        protector.encrypt(row.title, salt),
        protector.encrypt(row.description, salt),
        salt.toString("base64url"),
        row.id,
      );
    }

    const migratedRows = sqlite
      .query(
        `SELECT id, title, description, encryption_salt
         FROM support_requests`,
      )
      .all() as StoredSupportRequest[];

    for (const row of migratedRows) {
      if (!row.encryption_salt) {
        throw new Error(
          `Support request ${row.id} is missing its encryption salt`,
        );
      }
      const title = protector.decrypt(row.title, row.encryption_salt);
      const description = protector.decrypt(
        row.description,
        row.encryption_salt,
      );
      if (title === null || description === null) {
        throw new Error(
          `Support request ${row.id} has incomplete encrypted data`,
        );
      }
    }
  });

  migrate();

  const { journal_mode: journalMode } = sqlite
    .query("PRAGMA journal_mode")
    .get() as { journal_mode: string };
  if (journalMode === "wal") {
    const { busy } = sqlite.query("PRAGMA wal_checkpoint(TRUNCATE)").get() as {
      busy: number;
    };
    if (busy !== 0) {
      throw new Error(
        "Could not checkpoint encrypted support request data from the WAL",
      );
    }
  }
}
