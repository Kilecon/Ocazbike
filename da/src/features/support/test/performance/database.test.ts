import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { users } from "../../../../shared/database/schema/auth";
import { createTestDatabase } from "../../../../shared/database/testDatabase";
import { ClientDataProtector } from "../../../clients/crypto/ClientDataProtector";
import { DrizzleSupportRequestRepository } from "../../infrastructure/DrizzleSupportRequestRepository";

const SAMPLE_COUNT = 25;
const OPERATIONS_PER_SAMPLE = 10;

interface Measurement {
  operation: string;
  iterations: number;
  meanMs: number;
  p99Ms: number;
}

let database: ReturnType<typeof createTestDatabase>;
let repository: DrizzleSupportRequestRepository;
let creatorId: number;
let claimIds: number[] = [];
let completionIds: number[] = [];

async function seedRequest(index: number) {
  return repository.create({
    type: (["SR", "INC", "BUG"] as const)[index % 3],
    title: `Performance request ${index}`,
    description: "Support repository performance fixture.",
    createdByUserId: creatorId,
  });
}

async function measure(
  operation: string,
  action: (index: number) => Promise<unknown>,
): Promise<Measurement> {
  const samples: number[] = [];
  let operationIndex = 0;

  for (let sample = 0; sample < SAMPLE_COUNT; sample += 1) {
    const start = performance.now();
    for (let offset = 0; offset < OPERATIONS_PER_SAMPLE; offset += 1) {
      await action(operationIndex);
      operationIndex += 1;
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

function getId(ids: number[], index: number, operation: string): number {
  const id = ids[index];
  if (id === undefined) {
    throw new Error(
      `Missing support request ID for ${operation} iteration ${index}`,
    );
  }
  return id;
}

beforeAll(async () => {
  database = createTestDatabase("support-performance");
  repository = new DrizzleSupportRequestRepository(
    database.database,
    new ClientDataProtector(Buffer.alloc(32, 43)),
  );
  const [creator] = await database.database
    .insert(users)
    .values({
      email: `support-performance-${crypto.randomUUID()}@example.test`,
      encryptionSalt: crypto.randomUUID(),
      passwordHash: "performance-password-hash",
    })
    .returning({ id: users.id });
  creatorId = creator.id;

  const claims = [];
  const completions = [];
  for (
    let index = 0;
    index < SAMPLE_COUNT * OPERATIONS_PER_SAMPLE;
    index += 1
  ) {
    const request = await seedRequest(index);
    claims.push(request.id);
    completions.push(request.id);
  }
  claimIds = claims;
  completionIds = completions;
});

afterAll(() => database?.cleanup());

describe("support repository SQLite performance", () => {
  it("measures create, paginated list, notification claim, and completion", async () => {
    const results = [
      await measure("create", (index) => seedRequest(1_000 + index)),
      await measure("listPage", () =>
        repository.listPage({ page: 1, limit: 10 }),
      ),
      await measure("claimNotification", (index) =>
        repository.claimNotification(
          getId(claimIds, index, "claimNotification"),
          new Date(),
        ),
      ),
      await measure("completeNotification(failed)", (index) =>
        repository.completeNotification(
          getId(completionIds, index, "completeNotification"),
          "failed",
          new Date(),
        ),
      ),
    ];

    console.table(
      results.map((result) => ({
        operation: result.operation,
        iterations: result.iterations,
        "mean (ms)": result.meanMs.toFixed(3),
        "p99 (ms)": result.p99Ms.toFixed(3),
      })),
    );
    expect(results).toHaveLength(4);
    for (const result of results) {
      expect(result.p99Ms).toBeLessThanOrEqual(25);
    }
  });
});
