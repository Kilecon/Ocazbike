import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { users } from "../../../../shared/database/schema/auth";
import {
  billingDocuments,
  clientSearchTrigrams,
  clients,
} from "../../../../shared/database/schema/billing";
import { createTestDatabase } from "../../../../shared/database/testDatabase";
import { iso8601ToUtcTimestamp } from "../../../auth/date";
import { DrizzleBillingDocumentRepository } from "../../../billing/infrastructure/DrizzleBillingDocumentRepository";
import { ClientDataProtector } from "../../crypto/ClientDataProtector";
import { migrateClientData } from "../../crypto/migrateClientData";
import { DrizzleClientRepository } from "../../infrastructure/DrizzleClientRepository";

const protector = new ClientDataProtector(Buffer.alloc(32, 7));
let testDatabase: ReturnType<typeof createTestDatabase>;
let db: ReturnType<typeof createTestDatabase>["database"];
let sqlite: ReturnType<typeof createTestDatabase>["sqlite"];
let repository: DrizzleClientRepository;
let actorUserId: number;

beforeAll(async () => {
  testDatabase = createTestDatabase("clients-drizzle-repository");
  db = testDatabase.database;
  sqlite = testDatabase.sqlite;
  repository = new DrizzleClientRepository(db, protector);
  const [actor] = await db
    .insert(users)
    .values({
      email: `client-repository-${crypto.randomUUID()}@example.com`,
      encryptionSalt: crypto.randomUUID(),
      passwordHash: "test",
    })
    .returning({ id: users.id });
  actorUserId = actor.id;
});

afterAll(() => testDatabase?.cleanup());

describe("DrizzleClientRepository integration", () => {
  it("persists missing contacts and business fields and keeps the remaining contact searchable", async () => {
    const emailOnly = await repository.create(
      {
        firstname: "Camille",
        lastname: "Martin",
        email: "email-only@example.com",
        isProfessional: true,
        siret: "  ",
        companyName: "",
        identityCardNumber: "  ",
      },
      actorUserId,
    );
    const phoneOnly = await repository.create(
      {
        firstname: "Alex",
        lastname: "Durand",
        phonenumber: "0612345678",
      },
      actorUserId,
    );
    try {
      expect(emailOnly.phonenumber).toBe("");
      expect(emailOnly.siret).toBeNull();
      expect(emailOnly.companyName).toBeNull();
      expect(emailOnly.identityCardNumber).toBeNull();
      expect(phoneOnly.email).toBe("");
      expect((await repository.getById(emailOnly.id))?.phonenumber).toBe("");
      const byEmail = await repository.listPage({
        page: 1,
        limit: 10,
        search: "email-only@example.com",
      });
      const byPhone = await repository.listPage({
        page: 1,
        limit: 10,
        search: "0612345678",
      });
      expect(byEmail.clients.map(({ id }) => id)).toContain(emailOnly.id);
      expect(byPhone.clients.map(({ id }) => id)).toContain(phoneOnly.id);
      const updated = await repository.update(
        emailOnly.id,
        {
          firstname: "Camille",
          lastname: "Martin",
          phonenumber: "0698765432",
          isProfessional: true,
        },
        actorUserId,
      );
      expect(updated?.email).toBe("");
      expect(updated?.phonenumber).toBe("0698765432");
      expect(updated?.companyName).toBeNull();
      expect(updated?.siret).toBeNull();
    } finally {
      for (const client of [emailOnly, phoneOnly]) {
        await db
          .delete(clientSearchTrigrams)
          .where(eq(clientSearchTrigrams.clientId, client.id));
        await db.delete(clients).where(eq(clients.id, client.id));
      }
    }
  });

  it("encrypts client fields and finds exact matches after trigram filtering", async () => {
    const suffix = crypto.randomUUID();
    const ada = await repository.create(
      {
        firstname: "Ada",
        lastname: "Lovelace",
        email: `ada-${suffix}@example.com`,
        phonenumber: "+33 (0)6 12 34 56 78",
        address: "1 rue de Rivoli",
        addressComplement: "Bâtiment A",
        identityCardNumber: "ID-123456",
        privatenote: "Contact by email",
      },
      actorUserId,
    );
    expect(ada).toMatchObject({
      modifiedByUserId: actorUserId,
      lastModificationMs: expect.any(Number),
      createdAtMs: expect.any(Number),
    });
    const splitMatch = await repository.create(
      {
        firstname: "aba",
        lastname: "bab",
        email: `split-${suffix}@example.com`,
        phonenumber: "0102030405",
      },
      actorUserId,
    );
    const [repair] = await db
      .insert(billingDocuments)
      .values({
        clientId: ada.id,
        type: "repair",
        dateMs: iso8601ToUtcTimestamp("2026-10-16T00:00:00Z"),
        status: "in_progress",
      })
      .returning();
    try {
      expect(await repository.getById(ada.id)).toMatchObject({
        id: ada.id,
        firstname: "Ada",
        addressComplement: "Bâtiment A",
        identityCardNumber: "ID-123456",
      });
      expect(await repository.getById(ada.id)).not.toHaveProperty("operations");
      expect(await repository.getById(-1)).toBeNull();
      expect(
        (
          sqlite.query("PRAGMA table_xinfo(billing_documents)").all() as {
            name: string;
            hidden: number;
          }[]
        ).find(({ name }) => name === "date")?.hidden,
      ).toBe(2);
      const stored = sqlite
        .query(
          `SELECT firstname, lastname, email, phonenumber, address,
                  address_complement, identity_card_number, privatenote, encryption_salt
           FROM clients WHERE id = ?`,
        )
        .get(ada.id) as Record<string, string | null>;
      expect(stored.firstname).not.toContain("Ada");
      expect(stored.lastname).not.toContain("Lovelace");
      expect(stored.email).not.toContain("ada-");
      expect(stored.phonenumber).not.toBe("+33 (0)6 12 34 56 78");
      expect(stored.address).not.toContain("Rivoli");
      expect(stored.address_complement).not.toContain("Bâtiment A");
      expect(stored.identity_card_number).not.toContain("ID-123456");
      expect(stored.privatenote).not.toContain("Contact");
      expect(stored.encryption_salt).toBeTruthy();
      const splitStoredSalt = sqlite
        .query("SELECT encryption_salt FROM clients WHERE id = ?")
        .get(splitMatch.id) as { encryption_salt: string | null };
      expect(stored.encryption_salt).not.toBe(splitStoredSalt.encryption_salt);

      const exact = await repository.listPage({
        page: 1,
        limit: 20,
        search: "ADA",
      });
      expect(exact.clients.map(({ id }) => id)).toContain(ada.id);

      const accentInsensitive = await repository.listPage({
        page: 1,
        limit: 20,
        search: "loveláce",
      });
      expect(accentInsensitive.clients.map(({ id }) => id)).toContain(ada.id);

      const formattedPhone = await repository.listPage({
        page: 1,
        limit: 20,
        search: "0612345678",
      });
      expect(formattedPhone.clients.map(({ id }) => id)).toContain(ada.id);
      const byAddressComplement = await repository.listPage({
        page: 1,
        limit: 20,
        search: "Bâtiment A",
      });
      expect(byAddressComplement.clients.map(({ id }) => id)).toContain(ada.id);

      const firstPage = await repository.listPage({
        page: 1,
        limit: 1,
        search: suffix,
      });
      const secondPage = await repository.listPage({
        page: 2,
        limit: 1,
        search: suffix,
      });
      expect(firstPage.total).toBe(2);
      expect(secondPage.total).toBe(2);
      expect(firstPage.clients[0].id).not.toBe(secondPage.clients[0].id);

      const matchingClients = await repository.listPage({
        page: 1,
        limit: 20,
        search: suffix,
      });
      expect(matchingClients.clients.map(({ id }) => id).sort()).toEqual(
        [ada.id, splitMatch.id].sort(),
      );
      const repairOverview = await new DrizzleBillingDocumentRepository(
        db,
        protector,
      ).listActiveRepairs();
      expect(repairOverview[0]).toMatchObject({
        clientId: ada.id,
        clientFirstname: "Ada",
        clientLastname: "Lovelace",
        clientEmail: `ada-${suffix}@example.com`,
        clientPhoneNumber: "+33 (0)6 12 34 56 78",
      });
      expect(repairOverview[0]).not.toHaveProperty("clientEncryptionSalt");

      const falsePositive = await repository.listPage({
        page: 1,
        limit: 20,
        search: "ababa",
      });
      expect(falsePositive.clients.map(({ id }) => id)).not.toContain(
        splitMatch.id,
      );
    } finally {
      sqlite
        .prepare("DELETE FROM client_search_trigrams WHERE client_id IN (?, ?)")
        .run(ada.id, splitMatch.id);
      sqlite
        .prepare("DELETE FROM billing_documents WHERE id = ?")
        .run(repair.id);
      sqlite
        .prepare("DELETE FROM clients WHERE id IN (?, ?)")
        .run(ada.id, splitMatch.id);
    }
  });

  it("encrypts legacy plaintext rows and creates their search index", async () => {
    const suffix = crypto.randomUUID();
    const [legacy] = await db
      .insert(clients)
      .values({
        firstname: `Zoé-${suffix}`,
        lastname: "Legacy",
        email: `legacy-${suffix}@example.com`,
        phonenumber: "1234567890",
        address: "2 rue du Test",
        addressComplement: "Entrée 2",
        privatenote: "Legacy note",
      })
      .returning();

    try {
      migrateClientData(sqlite, protector);
      const stored = sqlite
        .query(
          "SELECT firstname, address_complement, identity_card_number, encryption_salt FROM clients WHERE id = ?",
        )
        .get(legacy.id) as {
        firstname: string;
        address_complement: string | null;
        identity_card_number: string | null;
        encryption_salt: string | null;
      };
      expect(stored.firstname).not.toContain(`Zoé-${suffix}`);
      expect(stored.address_complement).not.toContain("Entrée 2");
      expect(stored.identity_card_number).toBeNull();
      expect(stored.encryption_salt).toBeTruthy();

      const result = await repository.listPage({
        page: 1,
        limit: 20,
        search: `legacy-${suffix}`,
      });
      expect(result.clients).toHaveLength(1);
      expect(result.clients[0]).toMatchObject({
        id: legacy.id,
        firstname: `Zoé-${suffix}`,
        address: "2 rue du Test",
        addressComplement: "Entrée 2",
        identityCardNumber: null,
        privatenote: "Legacy note",
      });
    } finally {
      await db
        .delete(clientSearchTrigrams)
        .where(eq(clientSearchTrigrams.clientId, legacy.id));
      await db.delete(clients).where(eq(clients.id, legacy.id));
    }
  });

  it("updates professional fields and replaces their searchable trigrams", async () => {
    const suffix = crypto.randomUUID();
    const unchanged = await repository.create(
      {
        firstname: "Aline",
        lastname: "Older",
        email: `older-${suffix}@example.com`,
        phonenumber: "0600000001",
      },
      actorUserId,
    );
    const client = await repository.create(
      {
        firstname: "Camille",
        lastname: "Martin",
        email: `camille-${suffix}@example.com`,
        phonenumber: "0600000000",
      },
      actorUserId,
    );

    try {
      const updated = await repository.update(
        client.id,
        {
          firstname: "Camille",
          lastname: "Martin",
          email: `camille-${suffix}@example.com`,
          phonenumber: "0600000000",
          isProfessional: true,
          siret: "12345678901234",
          companyName: `Atelier Ancien ${suffix}`,
        },
        actorUserId,
      );
      expect(updated).toMatchObject({
        id: client.id,
        isProfessional: true,
        siret: "12345678901234",
        companyName: `Atelier Ancien ${suffix}`,
        modifiedByUserId: actorUserId,
        createdAtMs: client.createdAtMs,
      });
      expect(updated?.lastModificationMs).toBeGreaterThan(
        client.lastModificationMs,
      );

      const oldCompanySearch = await repository.listPage({
        page: 1,
        limit: 20,
        search: "Atelier Ancien",
      });
      expect(oldCompanySearch.clients.map(({ id }) => id)).toContain(client.id);

      const updatedCompanyName = `Atelier Nouveau ${suffix}`;
      const renamed = await repository.update(
        client.id,
        {
          firstname: "Camille",
          lastname: "Martin",
          email: `camille-${suffix}@example.com`,
          phonenumber: "0600000000",
          isProfessional: true,
          siret: "12345678901234",
          companyName: updatedCompanyName,
        },
        actorUserId,
      );
      expect(renamed?.companyName).toBe(updatedCompanyName);
      const newestPage = await repository.listPage({
        page: 1,
        limit: 1,
      });
      expect(newestPage.clients[0].id).toBe(client.id);
      expect(newestPage.total).toBe(2);

      const staleSearch = await repository.listPage({
        page: 1,
        limit: 20,
        search: "Atelier Ancien",
      });
      const companySearch = await repository.listPage({
        page: 1,
        limit: 20,
        search: updatedCompanyName,
      });
      expect(staleSearch.clients.map(({ id }) => id)).not.toContain(client.id);
      expect(companySearch.clients.map(({ id }) => id)).toContain(client.id);

      const stored = sqlite
        .query("SELECT siret, company_name FROM clients WHERE id = ?")
        .get(client.id) as { siret: string; company_name: string };
      expect(stored.siret).not.toBe("12345678901234");
      expect(stored.company_name).not.toContain("Atelier Nouveau");

      const notFound = await repository.update(
        -1,
        {
          firstname: "Nobody",
          lastname: "Missing",
          email: `missing-${suffix}@example.com`,
          phonenumber: "0600000000",
        },
        actorUserId,
      );
      expect(notFound).toBeNull();
    } finally {
      sqlite
        .prepare("DELETE FROM client_search_trigrams WHERE client_id = ?")
        .run(client.id);
      sqlite.prepare("DELETE FROM clients WHERE id = ?").run(client.id);
      sqlite.prepare("DELETE FROM clients WHERE id = ?").run(unchanged.id);
    }
  });

  it("refuses to start when an encrypted row cannot be authenticated", async () => {
    const client = await repository.create(
      {
        firstname: "Key",
        lastname: "Mismatch",
        email: `key-mismatch-${crypto.randomUUID()}@example.com`,
        phonenumber: "1234567890",
      },
      actorUserId,
    );

    try {
      expect(() =>
        migrateClientData(sqlite, new ClientDataProtector(Buffer.alloc(32, 8))),
      ).toThrow();
    } finally {
      sqlite
        .prepare("DELETE FROM client_search_trigrams WHERE client_id = ?")
        .run(client.id);
      sqlite.prepare("DELETE FROM clients WHERE id = ?").run(client.id);
    }
  });
});
