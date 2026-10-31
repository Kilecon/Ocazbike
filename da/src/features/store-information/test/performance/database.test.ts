import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { DataProtector } from "../../../../shared/crypto/DataProtector";
import { storeInformation as storeInformationTable } from "../../../../shared/database/schema/storeInformation";
import { createTestDatabase } from "../../../../test-support/testDatabase";
import { DrizzleStoreInformationRepository } from "../../infrastructure/DrizzleStoreInformationRepository";
import { EMPTY_STORE_INFORMATION } from "../../model";

const SAMPLE_COUNT = 25;
const OPERATIONS_PER_SAMPLE = 10;

let database: ReturnType<typeof createTestDatabase>;
let repository: DrizzleStoreInformationRepository;
const information = {
  name: "Store performance",
  address: "1 rue de Test",
  phone: "0600000000",
  email: "performance@example.test",
  siret: "12345678901234",
  apeCode: "4649Z",
  vatNumber: "FR00123456789",
  bankName: "Test bank",
  iban: "FR001234",
  bic: "TESTFRPP",
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

async function measure(
  action: (index: number) => Promise<unknown>,
): Promise<{ meanMs: number; p99Ms: number }> {
  const samples: number[] = [];
  for (let sample = 0; sample < SAMPLE_COUNT; sample += 1) {
    const start = performance.now();
    for (let offset = 0; offset < OPERATIONS_PER_SAMPLE; offset += 1) {
      await action(sample * OPERATIONS_PER_SAMPLE + offset);
    }
    samples.push((performance.now() - start) / OPERATIONS_PER_SAMPLE);
  }
  const meanMs =
    samples.reduce((sum, sample) => sum + sample, 0) / samples.length;
  samples.sort((left, right) => left - right);
  return { meanMs, p99Ms: samples[Math.ceil(samples.length * 0.99) - 1] };
}

describe("store information repository SQLite performance", () => {
  it("measures encrypted reads and writes", async () => {
    const read = await measure(() => repository.get());
    const write = await measure((index) =>
      repository.update({ ...information, phone: `060000${index}` }),
    );

    console.table([
      {
        operation: "get (decrypt)",
        iterations: 250,
        "mean (ms)": read.meanMs.toFixed(3),
        "p99 (ms)": read.p99Ms.toFixed(3),
      },
      {
        operation: "update (encrypt)",
        iterations: 250,
        "mean (ms)": write.meanMs.toFixed(3),
        "p99 (ms)": write.p99Ms.toFixed(3),
      },
    ]);
    expect(read.p99Ms).toBeLessThanOrEqual(25);
    expect(write.p99Ms).toBeLessThanOrEqual(25);
    expect(await repository.get()).toEqual({
      ...information,
      phone: "060000249",
    });
  });

  it("measures the empty-store read path", async () => {
    await database.database.delete(storeInformationTable);
    expect(await repository.get()).toEqual(EMPTY_STORE_INFORMATION);
  });
});
