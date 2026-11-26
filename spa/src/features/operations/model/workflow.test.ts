import { describe, expect, it } from "bun:test";
import { createBillingOperation } from "../testing";
import type { BillingSnapshotDTO } from "../types";
import {
  availableTransitions,
  awaitsPayment,
  closedAtOf,
  creationSuccessMessage,
  hasZeroTotal,
} from "./workflow";

const snapshot = (
  overrides: Partial<BillingSnapshotDTO>,
): BillingSnapshotDTO => ({
  kind: "quote",
  status: "pending",
  payload: {},
  createdAt: 1,
  updatedAt: 1,
  ...overrides,
});

describe("operation workflow", () => {
  it("offers the transitions allowed by the status", () => {
    const labels = (operation: ReturnType<typeof createBillingOperation>) =>
      availableTransitions(operation).map(({ label }) => label);
    expect(labels(createBillingOperation({ status: "pending" }))).toEqual([
      "acceptQuote",
      "rejectQuote",
    ]);
    expect(labels(createBillingOperation({ status: "in_progress" }))).toEqual([
      "completeOperation",
    ]);
    expect(
      labels(createBillingOperation({ status: "completed", snapshots: [] })),
    ).toEqual(["createInvoice"]);
    expect(
      labels(
        createBillingOperation({
          status: "completed",
          snapshots: [snapshot({ kind: "invoice" })],
        }),
      ),
    ).toEqual([]);
    expect(labels(createBillingOperation({ status: "paid" }))).toEqual([]);
  });

  it("awaits payment of completed operations unless the total is zero", () => {
    const due = createBillingOperation({ status: "payment_pending" });
    expect(awaitsPayment(due)).toBe(true);
    expect(awaitsPayment(createBillingOperation({ status: "paid" }))).toBe(
      false,
    );
    expect(
      hasZeroTotal({
        ...due,
        lines: due.lines.map((line) => ({ ...line, total: "0.004" })),
      }),
    ).toBe(true);
  });

  it("closes on quote rejection or invoice payment", () => {
    expect(
      closedAtOf(
        createBillingOperation({
          snapshots: [snapshot({ status: "rejected", updatedAt: 5 })],
        }),
      ),
    ).toBe(5);
    expect(
      closedAtOf(
        createBillingOperation({
          snapshots: [snapshot({ kind: "invoice", status: "paid", paidAt: 9 })],
        }),
      ),
    ).toBe(9);
    expect(closedAtOf(createBillingOperation({ snapshots: [] }))).toBeNull();
  });
});
describe("creation message", () => {
  it("reflects the quote and the operation type", () => {
    expect(
      creationSuccessMessage("sale", true, { status: "in_progress" }),
    ).toBe("zeroQuoteAccepted");
    expect(creationSuccessMessage("sale", true, { status: "pending" })).toBe(
      "operationCreatedWithQuote",
    );
    expect(
      creationSuccessMessage("repair", false, { status: "in_progress" }),
    ).toBe("repairStarted");
    expect(
      creationSuccessMessage("rental", false, { status: "in_progress" }),
    ).toBe("operationCreated");
  });
});
