import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { ok } from "node:assert/strict";
import {
  BILLING_DOCUMENT_TYPES,
  BillingOperationInputError,
  BillingWorkflowConflictError,
  type CreateBillingOperationInput,
} from "../../IBillingDocumentRepository";
import { createBillingIntegrationFixture } from "./helpers";

let fixture: ReturnType<typeof createBillingIntegrationFixture>;
let input: CreateBillingOperationInput;

beforeEach(async () => {
  fixture = createBillingIntegrationFixture("billing-repository");
  await fixture.reset();
  const client = await fixture.clients.create(
    { firstname: "Ada", lastname: "Lovelace", email: "ada@example.test" },
    fixture.admin.id,
  );
  input = {
    clientId: client.id,
    type: "repair",
    date: "2026-10-05T12:00:00Z",
    lines: [
      {
        description: "Service",
        quantity: "1",
        unitPrice: "10",
        vatRate: "0",
        total: "10",
      },
    ],
  };
});
afterEach(() => fixture?.cleanup());

const documentCount = async () =>
  (await fixture.repository.listOperations({ page: 1, limit: 1 })).total;

describe("billing repository SQLite", () => {
  it("returns null for every missing operation without creating documents", async () => {
    const repository = fixture.repository;
    for (const result of [
      await repository.getOperation(999),
      await repository.acceptQuote(999),
      await repository.rejectQuote(999),
      await repository.completeOperation(999),
      await repository.payOperation(999, "cash"),
      await repository.createOperation({ ...input, clientId: 999 }),
    ])
      expect(result).toBeNull();
    expect(
      await repository.listOperations({ page: 1, limit: 10 }),
    ).toMatchObject({ operations: [], total: 0 });
  });

  it.each(BILLING_DOCUMENT_TYPES)(
    "rejects reversed %s periods without writes",
    async (type) => {
      await expect(
        fixture.repository.createOperation({
          ...input,
          type,
          serviceStartAt: "2026-10-08T00:00:00Z",
          serviceEndAt: "2026-10-06T00:00:00Z",
        }),
      ).rejects.toBeInstanceOf(BillingOperationInputError);
      expect(await documentCount()).toBe(0);
    },
  );

  it.each([
    { quantity: "0" },
    { unitPrice: "-10" },
    { total: "-10" },
    { unitPrice: "10.001" },
    { total: "invalid" },
  ])(
    "rejects invalid billing amounts or discount signs %p atomically",
    async (fields) => {
      await expect(
        fixture.repository.createOperation({
          ...input,
          lines: [
            {
              description: "Service",
              quantity: "1",
              unitPrice: "10",
              vatRate: "0",
              total: "10",
              ...fields,
            },
          ],
        }),
      ).rejects.toBeInstanceOf(BillingOperationInputError);
      expect(await documentCount()).toBe(0);
    },
  );

  it.each(["card", "cheque", "bank_transfer", "cash"] as const)(
    "settles a nonzero invoice with %s once, preserving its JSON",
    async (method) => {
      const created = await fixture.repository.createOperation(input);
      expect(created).not.toBeNull();
      ok(created);
      const id = created.id;
      const completed = await fixture.repository.completeOperation(id);
      ok(completed);
      const payload = completed.snapshots[0].payload;
      await expect(
        fixture.repository.payOperation(id, "free"),
      ).rejects.toBeInstanceOf(BillingWorkflowConflictError);
      expect((await fixture.repository.getOperation(id))?.status).toBe(
        "payment_pending",
      );
      const paid = await fixture.repository.payOperation(id, method);
      expect(paid).toMatchObject({ status: "paid", paymentMethod: method });
      ok(paid);
      expect(paid.snapshots[0]).toMatchObject({
        status: "paid",
        paymentMethod: method,
        paidAt: expect.any(Number),
        payload,
      });
      await expect(
        fixture.repository.payOperation(id, method),
      ).rejects.toBeInstanceOf(BillingWorkflowConflictError);
      expect(
        (await fixture.repository.getOperation(id))?.snapshots,
      ).toHaveLength(1);
    },
  );

  it.each([
    ["completeOperation", "payment_pending", "unpaid"],
    ["payOperation", "paid", "paid"],
  ] as const)(
    "invoices legacy completed operations through %s",
    async (action, status, invoiceStatus) => {
      const created = await fixture.repository.createOperation(input);
      ok(created);
      fixture.database.sqlite
        .query("UPDATE billing_documents SET status = 'completed' WHERE id = ?")
        .run(created.id);
      const result =
        action === "payOperation"
          ? await fixture.repository.payOperation(created.id, "cash")
          : await fixture.repository.completeOperation(created.id);
      expect(result?.status).toBe(status);
      expect(result?.snapshots).toMatchObject([
        { kind: "invoice", status: invoiceStatus },
      ]);
    },
  );
});
