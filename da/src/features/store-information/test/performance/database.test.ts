import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { DataProtector } from "../../../../shared/crypto/DataProtector";
import { storeInformation as storeInformationTable } from "../../../../shared/database/schema/storeInformation";
import { measureSequentialBatches } from "../../../../tests-helpers/sequentialPerformance";
import { createTestDatabase } from "../../../../tests-helpers/testDatabase";
import { DrizzleStoreInformationRepository } from "../../infrastructure/DrizzleStoreInformationRepository";
import { EMPTY_STORE_INFORMATION } from "../../model";

const SAMPLE_COUNT = 25;
const OPERATIONS_PER_SAMPLE = 10;

let database: ReturnType<typeof createTestDatabase>;
let repository: DrizzleStoreInformationRepository;
const information = {
  name: "Store performance",
  address: "2 Rue Pas Ici",
  phone: "06 00 00 00 00",
  secondaryPhone: "",
  email: "performance@example.test",
  siret: "12345678901234",
  apeCode: "4649Z",
  vatNumber: "FR00123456789",
  bankName: "BanqueInconnue",
  iban: "FR001234",
  bic: "BIC_INCONNU",
};

beforeAll(async () => {
  database = createTestDatabase("store-information-performance");
  repository = new DrizzleStoreInformationRepository(
    database.database,
    new DataProtector(Buffer.alloc(32, 47)),
  );
  await repository.update(information);
});

afterAll(() => database?.cleanup());

describe("store information repository SQLite performance", () => {
  it("measures encrypted reads and writes", async () => {
    const read = await measureSequentialBatches(
      () => repository.get(),
      SAMPLE_COUNT,
      OPERATIONS_PER_SAMPLE,
    );
    const write = await measureSequentialBatches(
      (index) => repository.update({ ...information, name: `Store ${index}` }),
      SAMPLE_COUNT,
      OPERATIONS_PER_SAMPLE,
    );

    console.table([
      {
        operation: "get (decrypt)",
        iterations: read.iterations,
        "mean (ms)": read.meanMs.toFixed(3),
        "p99 (ms)": read.p99Ms.toFixed(3),
      },
      {
        operation: "update (encrypt)",
        iterations: write.iterations,
        "mean (ms)": write.meanMs.toFixed(3),
        "p99 (ms)": write.p99Ms.toFixed(3),
      },
    ]);
    expect(read.p99Ms).toBeLessThanOrEqual(25);
    expect(write.p99Ms).toBeLessThanOrEqual(25);
    expect(await repository.get()).toEqual({
      ...information,
      name: "Store 249",
    });
  });

  it("measures the empty-store read path", async () => {
    await database.database.delete(storeInformationTable);
    expect(await repository.get()).toEqual(EMPTY_STORE_INFORMATION);
  });
});
