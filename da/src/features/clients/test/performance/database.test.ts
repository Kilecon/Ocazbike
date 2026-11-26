import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { DataProtector } from "../../../../shared/crypto/DataProtector";
import { users } from "../../../../shared/database/schema/auth";
import { measureSequentialBatches } from "../../../../tests-helpers/sequentialPerformance";
import { createTestDatabase } from "../../../../tests-helpers/testDatabase";
import type { CreateClientInput } from "../../IClientRepository";
import { DrizzleClientRepository } from "../../infrastructure/DrizzleClientRepository";

const SAMPLE_COUNT = 25;
const OPERATIONS_PER_SAMPLE = 10;
const protector = new DataProtector(Buffer.alloc(32, 43));

let database: ReturnType<typeof createTestDatabase>;
let repository: DrizzleClientRepository;
let actorUserId: number;
let existingClientId: number;

const makeInput = (index: number): CreateClientInput => ({
  firstname: `Performance${index}`,
  lastname: "Client",
  email: `performance-${index}@example.test`,
  phonenumber: "06 00 00 00 00",
  address: "2 Rue Pas Ici",
  addressComplement: "Bâtiment A",
  privatenote: "Performance fixture",
});

beforeAll(async () => {
  database = createTestDatabase("clients-performance");
  repository = new DrizzleClientRepository(database.database, protector);
  const [actor] = await database.database
    .insert(users)
    .values({
      email: `clients-performance-${crypto.randomUUID()}@example.test`,
      encryptionSalt: crypto.randomUUID(),
      passwordHash: "performance-hash",
    })
    .returning({ id: users.id });
  actorUserId = actor.id;

  const clients = await Promise.all(
    Array.from({ length: 100 }, (_, index) =>
      repository.create(makeInput(index), actorUserId),
    ),
  );
  existingClientId = clients[0]?.id ?? 0;
});

afterAll(() => database?.cleanup());

describe("client repository SQLite performance", () => {
  it("measures repository reads, writes, pagination, and indexed search", async () => {
    const measurements = [
      {
        operation: "create",
        ...(await measureSequentialBatches(
          async (index) => {
            await repository.create(makeInput(100 + index), actorUserId);
          },
          SAMPLE_COUNT,
          OPERATIONS_PER_SAMPLE,
        )),
      },
      {
        operation: "getById",
        ...(await measureSequentialBatches(
          () => repository.getById(existingClientId),
          SAMPLE_COUNT,
          OPERATIONS_PER_SAMPLE,
        )),
      },
      {
        operation: "update",
        ...(await measureSequentialBatches(
          () => repository.update(existingClientId, makeInput(0), actorUserId),
          SAMPLE_COUNT,
          OPERATIONS_PER_SAMPLE,
        )),
      },
      {
        operation: "listPage",
        ...(await measureSequentialBatches(
          () => repository.listPage({ page: 1, limit: 10 }),
          SAMPLE_COUNT,
          OPERATIONS_PER_SAMPLE,
        )),
      },
      {
        operation: "search",
        ...(await measureSequentialBatches(
          () =>
            repository.listPage({
              page: 1,
              limit: 10,
              search: "performance-0@example.test",
            }),
          SAMPLE_COUNT,
          OPERATIONS_PER_SAMPLE,
        )),
      },
    ];

    console.table(
      measurements.map((result) => ({
        operation: result.operation,
        iterations: result.iterations,
        "mean (ms)": result.meanMs.toFixed(3),
        "p99 (ms)": result.p99Ms.toFixed(3),
      })),
    );
    expect(measurements).toHaveLength(5);
    for (const result of measurements) {
      expect(result.p99Ms).toBeLessThanOrEqual(25);
    }
  });
});
