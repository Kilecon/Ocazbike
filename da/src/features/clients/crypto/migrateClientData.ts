import type { Database } from "bun:sqlite";
import type { ClientDataProtector } from "./ClientDataProtector";

interface StoredClientRow {
  id: number;
  firstname: string;
  lastname: string;
  email: string;
  phonenumber: string;
  address: string | null;
  address_complement: string | null;
  identity_card_number: string | null;
  privatenote: string | null;
  is_professional: number;
  siret: string | null;
  company_name: string | null;
  encryption_salt: string | null;
}

const PERSONAL_FIELDS = [
  "firstname",
  "lastname",
  "email",
  "phonenumber",
  "address",
  "address_complement",
  "identity_card_number",
  "privatenote",
  "siret",
  "company_name",
] as const;

export function migrateClientData(
  sqlite: Database,
  protector: ClientDataProtector,
): void {
  const migrate = sqlite.transaction(() => {
    const rows = sqlite
      .query(
        `SELECT id, firstname, lastname, email, phonenumber, address,
                address_complement, identity_card_number, privatenote,
                is_professional, siret, company_name, encryption_salt
         FROM clients
         WHERE encryption_salt IS NULL`,
      )
      .all() as StoredClientRow[];

    const updateClient = sqlite.query(
      `UPDATE clients
       SET firstname = ?, lastname = ?, email = ?, phonenumber = ?,
           address = ?, address_complement = ?, identity_card_number = ?,
           privatenote = ?, siret = ?, company_name = ?,
           encryption_salt = ?
       WHERE id = ?`,
    );
    const insertTrigram = sqlite.query(
      `INSERT OR IGNORE INTO client_search_trigrams (client_id, trigram)
       VALUES (?, ?)`,
    );

    for (const row of rows) {
      const salt = protector.createSalt();
      const fieldProtector = protector.createFieldProtector(salt);
      const encryptedFields = PERSONAL_FIELDS.map((field) =>
        fieldProtector.encrypt(row[field]),
      );
      updateClient.run(...encryptedFields, salt.toString("base64url"), row.id);

      const searchTokens = protector.searchTokensForValues([
        row.firstname,
        row.lastname,
        row.email,
        row.phonenumber,
        row.address_complement ?? "",
        row.company_name ?? "",
      ]);
      for (const token of searchTokens) {
        insertTrigram.run(row.id, token);
      }
    }

    const clients = sqlite
      .query(
        `SELECT id, firstname, lastname, email, phonenumber, address,
                address_complement, identity_card_number, privatenote,
                is_professional, siret, company_name, encryption_salt
         FROM clients`,
      )
      .all() as StoredClientRow[];

    for (const client of clients) {
      if (!client.encryption_salt) {
        throw new Error(`Client ${client.id} is missing its encryption salt`);
      }
      protector.decryptClient({
        id: client.id,
        firstname: client.firstname,
        lastname: client.lastname,
        email: client.email,
        phonenumber: client.phonenumber,
        address: client.address,
        addressComplement: client.address_complement,
        identityCardNumber: client.identity_card_number,
        privatenote: client.privatenote,
        isProfessional: Boolean(client.is_professional),
        siret: client.siret,
        companyName: client.company_name,
        encryptionSalt: client.encryption_salt,
      });
    }
  });

  migrate();
}
