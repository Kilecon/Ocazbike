import { describe, expect, it } from "bun:test";
import {
  BILLING_DOCUMENT_TYPES,
  type BillingOperationRecord,
  emptyOperationCounts,
  toOperationListItem,
} from "../../IBillingDocumentRepository";

function operation(): BillingOperationRecord {
  return {
    id: 1,
    clientId: 2,
    type: "repair",
    date: 1000,
    comment: "Comment",
    status: "in_progress",
    serviceStartAt: null,
    serviceEndAt: null,
    paymentMethod: null,
    paidAt: null,
    client: {
      id: 2,
      firstname: "Ada",
      lastname: "Lovelace",
      email: "ada@example.test",
      phonenumber: "0600000000",
      address: "1 rue de Test",
      addressComplement: null,
      isProfessional: false,
      companyName: null,
      siret: null,
    },
    lines: [
      {
        id: 1,
        billingDocumentId: 1,
        description: "Service",
        quantity: "1",
        unitPrice: "10",
        vatRate: "0",
        discount: "0",
        total: "10",
      },
    ],
    snapshots: [
      {
        kind: "quote",
        status: "accepted",
        createdAt: 1100,
        updatedAt: 1200,
        payload: { lines: ["immutable"] },
      },
    ],
  };
}

describe("billing list projection", () => {
  it("omits private client fields, lines and document payloads without mutating the detail", () => {
    const detail = operation();
    const original = structuredClone(detail);
    const summary = toOperationListItem(detail);
    expect(summary.client).toEqual({
      firstname: "Ada",
      lastname: "Lovelace",
      email: "ada@example.test",
    });
    expect(summary).not.toHaveProperty("lines");
    expect(summary).not.toHaveProperty("paymentStatus");
    expect(summary.snapshots).toEqual([
      { kind: "quote", status: "accepted", createdAt: 1100, updatedAt: 1200 },
    ]);
    expect(detail).toEqual(original);
  });

  it.each(BILLING_DOCUMENT_TYPES)(
    "prefers saved service dates for %s while preserving closure",
    (type) => {
      const detail = operation();
      detail.type = type;
      detail.serviceStartAt = 2000;
      detail.serviceEndAt = 3000;
      detail.snapshots.push({
        kind: "invoice",
        status: "paid",
        createdAt: 4000,
        updatedAt: 5000,
        paidAt: 5000,
        paymentMethod: "cash",
        payload: {},
      });
      expect(toOperationListItem(detail)).toMatchObject({
        serviceStartAt: 2000,
        serviceEndAt: 3000,
        closedAt: 5000,
      });
    },
  );

  it("falls back to creation and paid invoice dates, not legacy operation payment fields", () => {
    const detail = operation();
    detail.paidAt = 9999;
    expect(toOperationListItem(detail)).toMatchObject({
      serviceStartAt: 1000,
      serviceEndAt: null,
      closedAt: null,
    });
    detail.snapshots.push({
      kind: "invoice",
      status: "unpaid",
      createdAt: 2000,
      updatedAt: 2000,
      payload: {},
    });
    expect(toOperationListItem(detail).closedAt).toBeNull();
    detail.snapshots[1].status = "paid";
    expect(toOperationListItem(detail).closedAt).toBeNull();
    detail.snapshots[1].paidAt = 3000;
    expect(toOperationListItem(detail)).toMatchObject({
      serviceEndAt: 3000,
      closedAt: 3000,
    });
  });

  it("uses rejection metadata for closure without rewriting quote contents", () => {
    const detail = operation();
    detail.snapshots[0].status = "rejected";
    detail.snapshots[0].updatedAt = 4000;
    expect(toOperationListItem(detail)).toMatchObject({
      serviceEndAt: 4000,
      closedAt: 4000,
    });
    expect(detail.snapshots[0].payload).toEqual({ lines: ["immutable"] });
  });

  it("preserves explicitly saved epoch dates", () => {
    expect(
      toOperationListItem({
        ...operation(),
        serviceStartAt: 0,
        serviceEndAt: 0,
      }),
    ).toMatchObject({ serviceStartAt: 0, serviceEndAt: 0 });
  });
});

describe("billing counters", () => {
  it("returns the twelve zero counters with independent objects on every call", () => {
    const first = emptyOperationCounts();
    const second = emptyOperationCounts();
    expect(Object.keys(first).sort()).toEqual(
      [...BILLING_DOCUMENT_TYPES].sort(),
    );
    for (const type of BILLING_DOCUMENT_TYPES)
      expect(first[type]).toEqual({
        pending: 0,
        in_progress: 0,
        payment_pending: 0,
      });
    first.repair.pending = 5;
    expect(first.sale.pending).toBe(0);
    expect(second.repair.pending).toBe(0);
  });
});
