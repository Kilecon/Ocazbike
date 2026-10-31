import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { ok } from "node:assert/strict";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { DataProtector } from "../../../../shared/crypto/DataProtector";
import {
  authSchema,
  billingSchema,
  storeInformationSchema,
  supportSchema,
} from "../../../../shared/database/db";
import {
  BILLING_DOCUMENT_TYPES,
  toOperationListItem,
} from "../../IBillingDocumentRepository";
import { DrizzleBillingDocumentRepository } from "../../infrastructure/DrizzleBillingDocumentRepository";
import { createBillingIntegrationFixture } from "./helpers";

let fixture: ReturnType<typeof createBillingIntegrationFixture>;
beforeEach(async () => {
  fixture = createBillingIntegrationFixture("billing-listing");
  await fixture.reset();
});
afterEach(() => fixture?.cleanup());

const lines = [
  {
    description: "Service",
    quantity: "1",
    unitPrice: "10",
    vatRate: "0",
    total: "10",
  },
];
const date = "2026-10-05T12:00:00Z";

describe("billing summary queries", () => {
  it.each(BILLING_DOCUMENT_TYPES)(
    "matches full-detail projections for %s across document states",
    async (type) => {
      const client = await fixture.clients.create(
        { firstname: "Ada", lastname: "Lovelace", email: "ada@example.test" },
        fixture.admin.id,
      );
      const input = {
        clientId: client.id,
        type,
        date,
        lines,
        serviceStartAt: "2026-10-06T00:00:00Z",
        serviceEndAt: "2026-10-08T00:00:00Z",
      };
      for (const state of [
        "no_quote",
        "pending",
        "rejected",
        "accepted",
        "invoiced",
        "paid",
      ]) {
        const operation = await fixture.repository.createOperation({
          ...input,
          createQuote: state !== "no_quote",
        });
        ok(operation);
        if (state === "rejected")
          await fixture.repository.rejectQuote(operation.id);
        if (["accepted", "invoiced", "paid"].includes(state))
          await fixture.repository.acceptQuote(operation.id);
        if (["invoiced", "paid"].includes(state))
          await fixture.repository.completeOperation(operation.id);
        if (state === "paid")
          await fixture.repository.payOperation(operation.id, "cash");
      }
      const page = await fixture.repository.listOperations({
        type,
        page: 1,
        limit: 50,
      });
      expect(page.total).toBe(6);
      for (const summary of page.operations) {
        const detail = await fixture.repository.getOperation(summary.id);
        ok(detail);
        expect(summary).toEqual(toOperationListItem(detail));
      }
    },
  );

  it("uses three metadata-only queries regardless of page size and decrypts each distinct client once", async () => {
    for (let clientIndex = 0; clientIndex < 2; clientIndex += 1) {
      const client = await fixture.clients.create(
        {
          firstname: "Ada",
          lastname: `Client${clientIndex}`,
          email: `ada${clientIndex}@example.test`,
        },
        fixture.admin.id,
      );
      for (let index = 0; index < 12; index += 1) {
        await fixture.repository.createOperation({
          clientId: client.id,
          type: "repair",
          date,
          lines,
          createQuote: true,
        });
      }
    }
    const queries: string[] = [];
    const database = drizzle(fixture.database.sqlite, {
      schema: {
        ...authSchema,
        ...billingSchema,
        ...storeInformationSchema,
        ...supportSchema,
      },
      logger: {
        logQuery(query) {
          queries.push(query);
        },
      },
    });
    const protector = new DataProtector(Buffer.alloc(32, 31));
    const repository = new DrizzleBillingDocumentRepository(
      database,
      protector,
      fixture.clients,
    );
    const decryptClient = spyOn(protector, "createFieldProtector");
    const decryptPayload = spyOn(protector, "decrypt");
    try {
      for (const limit of [1, 10, 50]) {
        queries.length = 0;
        decryptClient.mockClear();
        decryptPayload.mockClear();
        const page = await repository.listOperations({ page: 1, limit });
        expect(page.operations).toHaveLength(Math.min(limit, 24));
        expect(queries).toHaveLength(3);
        for (const query of queries) {
          expect(query).not.toContain('"billing_lines"');
          expect(query).not.toContain('"encrypted_payload"');
        }
        expect(decryptClient).toHaveBeenCalledTimes(
          new Set(page.operations.map(({ clientId }) => clientId)).size,
        );
        expect(decryptPayload).not.toHaveBeenCalled();
      }
      queries.length = 0;
      expect(
        await repository.listOperations({ page: 100, limit: 10 }),
      ).toMatchObject({ operations: [], total: 24 });
      expect(queries).toHaveLength(2);
      const [first] = (await repository.listOperations({ page: 1, limit: 1 }))
        .operations;
      ok(first);
      const changedClientId = first.clientId;
      await fixture.clients.update(
        changedClientId,
        {
          firstname: "Updated",
          lastname: "Client",
          email: "updated@example.test",
        },
        fixture.admin.id,
      );
      const refreshed = await repository.listOperations({
        clientId: changedClientId,
        page: 1,
        limit: 10,
      });
      expect(
        refreshed.operations.every(
          ({ client }) => client.firstname === "Updated",
        ),
      ).toBe(true);
    } finally {
      decryptClient.mockRestore();
      decryptPayload.mockRestore();
    }
  });

  it("preserves legacy invoice metadata and prioritizes dedicated documents over legacy ones", async () => {
    const client = await fixture.clients.create(
      { firstname: "Ada", lastname: "Lovelace", email: "ada@example.test" },
      fixture.admin.id,
    );
    const operation = await fixture.repository.createOperation({
      clientId: client.id,
      type: "repair",
      date,
      lines,
    });
    ok(operation);
    const protector = new DataProtector(Buffer.alloc(32, 31));
    const salt = protector.createSalt();
    const payload = protector.encrypt(
      JSON.stringify({
        documentNumber: "FAC-LEGACY",
        documentKind: "invoice",
        lines,
      }),
      salt,
    );
    fixture.database.sqlite
      .query(
        "INSERT INTO billing_document_snapshots (billing_document_id, kind, status, encrypted_payload, encryption_salt, created_at_ms, updated_at_ms) VALUES (?, 'invoice', 'paid', ?, ?, 1000, 2000)",
      )
      .run(operation.id, payload, salt.toString("base64url"));
    fixture.database.sqlite
      .query(
        "UPDATE billing_documents SET payment_method = 'cash', paid_at_ms = 2000 WHERE id = ?",
      )
      .run(operation.id);
    const assertProjection = async () => {
      const detail = await fixture.repository.getOperation(operation.id);
      ok(detail);
      const page = await fixture.repository.listOperations({
        page: 1,
        limit: 10,
      });
      expect(page.operations[0]).toEqual(toOperationListItem(detail));
      return page.operations[0];
    };
    expect((await assertProjection()).snapshots[0]).toMatchObject({
      kind: "invoice",
      status: "paid",
      paidAt: 2000,
      paymentMethod: "cash",
    });
    fixture.database.sqlite
      .query(
        "INSERT INTO billing_invoices (billing_document_id, encrypted_payload, encryption_salt, issued_at_ms, status) VALUES (?, ?, ?, 3000, 'unpaid')",
      )
      .run(operation.id, payload, salt.toString("base64url"));
    const summary = await assertProjection();
    expect(summary.snapshots).toHaveLength(1);
    expect(summary.snapshots[0]).toMatchObject({
      status: "unpaid",
      createdAt: 3000,
      paidAt: null,
    });
    expect(summary.closedAt).toBeNull();
  });
});
