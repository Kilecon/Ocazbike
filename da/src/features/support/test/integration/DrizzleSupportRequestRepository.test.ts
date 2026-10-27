import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import { users } from "../../../../shared/database/schema/auth";
import { createTestDatabase } from "../../../../shared/database/testDatabase";
import { ClientDataProtector } from "../../../clients/crypto/ClientDataProtector";
import { migrateSupportRequestData } from "../../crypto/migrateSupportRequestData";
import { DrizzleSupportRequestRepository } from "../../infrastructure/DrizzleSupportRequestRepository";

const testDatabase = createTestDatabase("support-repository-test");
const protector = new ClientDataProtector(Buffer.alloc(32, 44));
migrateSupportRequestData(testDatabase.sqlite, protector);
const repository = new DrizzleSupportRequestRepository(
  testDatabase.database,
  protector,
);
testDatabase.database
  .insert(users)
  .values({
    email: "support-repository-test@example.test",
    passwordHash: "test-password-hash",
  })
  .run();

beforeEach(() => {
  testDatabase.sqlite.exec(
    "DELETE FROM support_requests; DELETE FROM sqlite_sequence WHERE name = 'support_requests';",
  );
});

afterAll(() => {
  testDatabase.cleanup();
});

describe("support database schema", () => {
  it("does not include the removed legacy creator column", () => {
    const columns = testDatabase.sqlite
      .query("PRAGMA table_xinfo(support_requests)")
      .all() as { name: string }[];

    expect(columns.map(({ name }) => name)).not.toContain("created_by_legacy");
    expect(columns.map(({ name }) => name)).toContain("encryption_salt");
  });

  it("stores new titles and descriptions encrypted with a unique row salt", async () => {
    const first = await repository.create({
      type: "SR",
      title: "Private title one",
      description: "Private description one",
      createdByUserId: 1,
    });
    const second = await repository.create({
      type: "BUG",
      title: "Private title two",
      description: "Private description two",
      createdByUserId: 1,
    });
    const stored = testDatabase.sqlite
      .query(
        `SELECT title, description, encryption_salt
         FROM support_requests ORDER BY id`,
      )
      .all() as {
      title: string;
      description: string;
      encryption_salt: string;
    }[];

    expect(stored).toHaveLength(2);
    expect(stored[0].title).not.toBe(first.title);
    expect(stored[0].description).not.toBe(first.description);
    expect(stored[0].encryption_salt).not.toBe(stored[1].encryption_salt);
    expect(await repository.listPage({ page: 1, limit: 10 })).toMatchObject({
      requests: [
        { title: second.title, description: second.description },
        { title: first.title, description: first.description },
      ],
    });
  });

  it("encrypts existing support titles and descriptions using a per-row salt", async () => {
    testDatabase.sqlite
      .prepare(
        `INSERT INTO support_requests
          (reference, type, title, description, status)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(
        "SR-2026-10-27-001",
        "SR",
        "Legacy title",
        "Legacy description",
        "created",
      );
    testDatabase.sqlite
      .prepare(
        `INSERT INTO support_requests
          (reference, type, title, description, status)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(
        "BUG-2026-10-27-001",
        "BUG",
        "Second legacy title",
        "Second legacy description",
        "created",
      );

    migrateSupportRequestData(testDatabase.sqlite, protector);

    const stored = testDatabase.sqlite
      .query(
        `SELECT title, description, encryption_salt
         FROM support_requests WHERE reference = ?`,
      )
      .get("SR-2026-10-27-001") as {
      title: string;
      description: string;
      encryption_salt: string;
    };
    expect(stored.title).not.toBe("Legacy title");
    expect(stored.description).not.toBe("Legacy description");
    expect(stored.title.startsWith("v1.")).toBe(true);
    expect(stored.description.startsWith("v1.")).toBe(true);
    expect(stored.encryption_salt).toBeTruthy();
    const secondSalt = testDatabase.sqlite
      .query("SELECT encryption_salt FROM support_requests WHERE reference = ?")
      .get("BUG-2026-10-27-001") as { encryption_salt: string };
    expect(secondSalt.encryption_salt).not.toBe(stored.encryption_salt);

    const page = await repository.listPage({ page: 1, limit: 10 });
    expect(page.requests).toMatchObject([
      {
        title: "Second legacy title",
        description: "Second legacy description",
      },
      { title: "Legacy title", description: "Legacy description" },
    ]);
  });
});

describe("DrizzleSupportRequestRepository.listPage", () => {
  it("paginates newest requests and applies type and status filters", async () => {
    const createdAt = [
      new Date("2026-10-25T10:00:00.000Z"),
      new Date("2026-10-26T10:00:00.000Z"),
      new Date("2026-10-27T10:00:00.000Z"),
    ];
    await Promise.all(
      [
        ["SR", "First request", "First description"],
        ["BUG", "Second request", "Second description"],
        ["BUG", "Third request", "Third description"],
      ].map(async ([type, title, description], index) => {
        const request = await repository.create({
          type: type as "SR" | "BUG",
          title,
          description,
          createdByUserId: 1,
        });
        testDatabase.sqlite
          .prepare("UPDATE support_requests SET created_at = ? WHERE id = ?")
          .run(createdAt[index].getTime(), request.id);
      }),
    );

    const firstPage = await repository.listPage({ page: 1, limit: 2 });
    expect(firstPage).toMatchObject({
      page: 1,
      limit: 2,
      total: 3,
      requests: [{ title: "Third request" }, { title: "Second request" }],
    });

    const filteredPage = await repository.listPage({
      page: 1,
      limit: 10,
      type: "BUG",
      status: "created",
    });
    expect(filteredPage).toMatchObject({
      page: 1,
      limit: 10,
      total: 2,
      requests: [{ title: "Third request" }, { title: "Second request" }],
    });
  });

  it("allows immediate retries after failures and throttles successful sends", async () => {
    const inserted = await repository.create({
      type: "INC",
      title: "Retry request",
      description: "Test notification retries.",
      createdByUserId: 1,
    });
    const firstAttemptAt = new Date("2026-10-27T10:00:00.000Z");
    const firstClaim = await repository.claimNotification(
      inserted.id,
      firstAttemptAt,
    );
    expect(firstClaim.claimed).toBe(true);
    const simultaneousClaim = await repository.claimNotification(
      inserted.id,
      firstAttemptAt,
    );
    expect(simultaneousClaim).toMatchObject({
      claimed: false,
      reason: "in_progress",
    });

    await repository.completeNotification(
      inserted.id,
      "failed",
      firstAttemptAt,
    );
    const retryClaim = await repository.claimNotification(
      inserted.id,
      new Date(firstAttemptAt.getTime() + 1000),
    );
    expect(retryClaim.claimed).toBe(true);

    const sentAt = new Date(firstAttemptAt.getTime() + 2000);
    await repository.completeNotification(inserted.id, "sent", sentAt);
    const pendingPage = await repository.listPage({
      page: 1,
      limit: 10,
      status: "pending",
    });
    expect(pendingPage.requests).toMatchObject([{ status: "pending" }]);

    const cooldown = await repository.claimNotification(
      inserted.id,
      new Date(sentAt.getTime() + 23 * 60 * 60 * 1000),
    );
    expect(cooldown).toMatchObject({
      claimed: false,
      reason: "cooldown",
    });

    const availableAgain = await repository.claimNotification(
      inserted.id,
      new Date(sentAt.getTime() + 24 * 60 * 60 * 1000),
    );
    expect(availableAgain.claimed).toBe(true);
    await repository.completeNotification(inserted.id, "failed", new Date());
    const afterFailedResend = await repository.listPage({
      page: 1,
      limit: 10,
      status: "pending",
    });
    expect(afterFailedResend.requests).toMatchObject([{ status: "pending" }]);
  });
});
