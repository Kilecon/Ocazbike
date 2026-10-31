import { describe, expect, it } from "bun:test";
import { DataProtector } from "../../../../shared/crypto/DataProtector";
import { storeInformation as storeInformationTable } from "../../../../shared/database/schema/storeInformation";
import { createTestDatabase } from "../../../../test-support/testDatabase";
import { DrizzleStoreInformationRepository } from "../../infrastructure/DrizzleStoreInformationRepository";
import { seedInitialStoreInformation } from "../../seedInitialStoreInformation";

describe("initial store information seeding", () => {
  it("encrypts the initial values, treats dashes as empty, and never overwrites", async () => {
    const database = createTestDatabase("store-information-seed");
    const protector = new DataProtector(Buffer.alloc(32, 29));
    const initialData = JSON.stringify({
      name: "Ocazbike",
      address: "8 Avenue de Picot, 33320 Eysines",
      phone: "-",
      email: "store@example.invalid",
      siret: "-",
      apeCode: "4649Z",
      vatNumber: "-",
      bankName: "-",
      iban: "FR00TEST",
      bic: "-",
    });

    try {
      await seedInitialStoreInformation(
        database.database,
        protector,
        initialData,
      );
      await seedInitialStoreInformation(
        database.database,
        protector,
        JSON.stringify({
          name: "Different name",
          address: "-",
          phone: "-",
          email: "-",
          siret: "-",
          apeCode: "-",
          vatNumber: "-",
          bankName: "-",
          iban: "-",
          bic: "-",
        }),
      );

      const [stored] = await database.database
        .select()
        .from(storeInformationTable);
      expect(stored.encryptedPayload).not.toContain("FR00TEST");
      expect(
        protector
          .createFieldProtector(Buffer.from(stored.encryptionSalt, "base64url"))
          .decrypt(stored.encryptedPayload),
      ).toBe(
        JSON.stringify({
          name: "Ocazbike",
          address: "8 Avenue de Picot, 33320 Eysines",
          phone: "",
          email: "store@example.invalid",
          siret: "",
          apeCode: "4649Z",
          vatNumber: "",
          bankName: "",
          iban: "FR00TEST",
          bic: "",
        }),
      );
      expect(
        await new DrizzleStoreInformationRepository(
          database.database,
          protector,
        ).get(),
      ).toEqual({
        name: "Ocazbike",
        address: "8 Avenue de Picot, 33320 Eysines",
        phone: "",
        email: "store@example.invalid",
        siret: "",
        apeCode: "4649Z",
        vatNumber: "",
        bankName: "",
        iban: "FR00TEST",
        bic: "",
      });
    } finally {
      database.cleanup();
    }
  });

  it("fails explicitly for malformed seed data", async () => {
    const database = createTestDatabase("store-information-seed-invalid");
    const protector = new DataProtector(Buffer.alloc(32, 31));
    try {
      await expect(
        seedInitialStoreInformation(database.database, protector, "invalid"),
      ).rejects.toThrow("STORE_INFORMATION_INITIAL_DATA must be valid JSON");
    } finally {
      database.cleanup();
    }
  });
});
