import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { users } from "../../../../shared/database/schema/auth";
import { createTestDatabase } from "../../../../shared/database/testDatabase";
import { ClientDataProtector } from "../../crypto/ClientDataProtector";
import type { CreateClientInput } from "../../IClientRepository";
import { DrizzleClientRepository } from "../../infrastructure/DrizzleClientRepository";

const SAMPLE_COUNT = 25;
const OPERATIONS_PER_SAMPLE = 10;
const protector = new ClientDataProtector(Buffer.alloc(32, 43));

interface Measurement {
  operation: string;
  iterations: number;
  meanMs: number;
  p99Ms: number;
}

let database: ReturnType<typeof createTestDatabase>;
let repository: DrizzleClientRepository;
let actorUserId: number;
let existingClientId: number;

const makeInput = (index: number): CreateClientInput => ({
  firstname: `Performance${index}`,
  lastname: "Client",
  email: `performance-${index}@example.test`,
  phonenumber: "0600000000",
  address: "1 rue de Test",
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

  for (let index = 0; index < 100; index += 1) {
    const client = await repository.create(makeInput(index), actorUserId);
    if (index === 0) existingClientId = client.id;
  }
});

afterAll(() => database?.cleanup());

async function measure(
  operation: string,
  action: (index: number) => Promise<unknown>,
): Promise<Measurement> {
  const samples: number[] = [];

  for (let sample = 0; sample < SAMPLE_COUNT; sample += 1) {
    const firstIndex = sample * OPERATIONS_PER_SAMPLE;
    const start = performance.now();
    for (let offset = 0; offset < OPERATIONS_PER_SAMPLE; offset += 1) {
      await action(firstIndex + offset);
    }
    samples.push((performance.now() - start) / OPERATIONS_PER_SAMPLE);
  }

  samples.sort((left, right) => left - right);
  return {
    operation,
    iterations: SAMPLE_COUNT * OPERATIONS_PER_SAMPLE,
    meanMs: samples.reduce((sum, sample) => sum + sample, 0) / samples.length,
    p99Ms: samples[Math.ceil(samples.length * 0.99) - 1],
  };
}

describe("client repository SQLite performance", () => {
  it("measures repository reads, writes, pagination, and indexed search", async () => {
    const measurements: Measurement[] = [];
    measurements.push(
      await measure("create", async (index) => {
        await repository.create(makeInput(100 + index), actorUserId);
      }),
    );
    measurements.push(
      await measure("getById", () => repository.getById(existingClientId)),
    );
    measurements.push(
      await measure("update", () =>
        repository.update(existingClientId, makeInput(0), actorUserId),
      ),
    );
    measurements.push(
      await measure("listPage", () =>
        repository.listPage({ page: 1, limit: 10 }),
      ),
    );
    measurements.push(
      await measure("search", () =>
        repository.listPage({
          page: 1,
          limit: 10,
          search: "performance-0@example.test",
        }),
      ),
    );

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
