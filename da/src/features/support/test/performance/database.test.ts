import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { DataProtector } from "../../../../shared/crypto/DataProtector";
import { users } from "../../../../shared/database/schema/auth";
import { measureSequentialBatches } from "../../../../tests-helpers/sequentialPerformance";
import { createTestDatabase } from "../../../../tests-helpers/testDatabase";
import { DrizzleSupportRequestRepository } from "../../infrastructure/DrizzleSupportRequestRepository";

const SAMPLE_COUNT = 25;
const OPERATIONS_PER_SAMPLE = 10;

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
    new DataProtector(Buffer.alloc(32, 43)),
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
  const requests = await Promise.all(
    Array.from({ length: SAMPLE_COUNT * OPERATIONS_PER_SAMPLE }, (_, index) =>
      seedRequest(index),
    ),
  );
  claims.push(...requests.map((request) => request.id));
  completions.push(...requests.map((request) => request.id));
  claimIds = claims;
  completionIds = completions;
});

afterAll(() => database?.cleanup());

describe("support repository SQLite performance", () => {
  it("measures create, paginated list, notification claim, and completion", async () => {
    const results = [
      {
        operation: "create",
        ...(await measureSequentialBatches(
          (index) => seedRequest(1_000 + index),
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
        operation: "claimNotification",
        ...(await measureSequentialBatches(
          (index) =>
            repository.claimNotification(
              getId(claimIds, index, "claimNotification"),
              new Date(),
            ),
          SAMPLE_COUNT,
          OPERATIONS_PER_SAMPLE,
        )),
      },
      {
        operation: "completeNotification(failed)",
        ...(await measureSequentialBatches(
          (index) =>
            repository.completeNotification(
              getId(completionIds, index, "completeNotification"),
              "failed",
              new Date(),
            ),
          SAMPLE_COUNT,
          OPERATIONS_PER_SAMPLE,
        )),
      },
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
