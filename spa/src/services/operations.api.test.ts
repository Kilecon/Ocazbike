import { afterEach, describe, expect, it } from "bun:test";
import {
  completeOperation,
  createOperation,
  getOperationCounts,
  getOperations,
  OPERATIONS_CHANGED_EVENT,
  payOperation,
} from "./operations.api";
import type { BillingOperationPageDTO } from "./types";

const originalFetch = globalThis.fetch;
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalWindow)
    Object.defineProperty(globalThis, "window", originalWindow);
  else Reflect.deleteProperty(globalThis, "window");
});

describe("operation creation", () => {
  it.each(["repair", "sale", "purchase", "rental"] as const)(
    "loads the %s client grid without default status filters or search",
    async (type) => {
      globalThis.fetch = Object.assign(
        async (input: RequestInfo | URL) => {
          const url = new URL(String(input));
          expect(Object.fromEntries(url.searchParams)).toEqual({
            type,
            clientId: "42",
            page: "2",
            limit: "10",
          });
          return Response.json({
            operations: [],
            page: 2,
            limit: 10,
            total: 0,
          });
        },
        { preconnect: originalFetch.preconnect },
      );
      await getOperations({ type, clientId: 42, page: 2, limit: 10 });
    },
  );
  it("sends combined status filters and client search before server pagination", async () => {
    globalThis.fetch = Object.assign(
      async (input: RequestInfo | URL) => {
        const url = new URL(String(input));
        expect(url.searchParams.get("status")).toBe(
          "pending,in_progress,payment_pending",
        );
        expect(url.searchParams.get("search")).toBe("Ada Lovelace");
        expect(url.searchParams.get("page")).toBe("2");
        return Response.json({ operations: [], page: 2, limit: 10, total: 0 });
      },
      { preconnect: originalFetch.preconnect },
    );
    await getOperations({
      type: "repair",
      statuses: ["pending", "in_progress", "payment_pending"],
      search: " Ada Lovelace ",
      page: 2,
      limit: 10,
    });
  });
  it("loads counts from one endpoint and notifies the sidebar only after successful writes", async () => {
    const counts = {
      repair: { pending: 2, in_progress: 0, payment_pending: 0 },
      sale: { pending: 0, in_progress: 0, payment_pending: 0 },
      purchase: { pending: 0, in_progress: 0, payment_pending: 0 },
      rental: { pending: 0, in_progress: 0, payment_pending: 0 },
    };
    const events: string[] = [];
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        dispatchEvent: (event: Event) => {
          events.push(event.type);
          return true;
        },
      },
    });
    let fail = false;
    globalThis.fetch = Object.assign(
      async (input: RequestInfo | URL) => {
        const path = new URL(String(input)).pathname;
        if (path === "/operations/counts") return Response.json(counts);
        return fail
          ? Response.json({ message: "Failure" }, { status: 500 })
          : Response.json({ id: 42 });
      },
      { preconnect: originalFetch.preconnect },
    );
    expect(await getOperationCounts()).toEqual(counts);
    expect(events).toHaveLength(0);
    await completeOperation(42);
    await payOperation(42, "cash");
    await createOperation({
      clientId: 1,
      type: "repair",
      date: "2026-10-31T12:00:00Z",
    });
    expect(events).toEqual([
      OPERATIONS_CHANGED_EVENT,
      OPERATIONS_CHANGED_EVENT,
      OPERATIONS_CHANGED_EVENT,
    ]);
    fail = true;
    await expect(completeOperation(42)).rejects.toThrow();
    expect(events).toHaveLength(3);
  });
  it.each(["repair", "sale", "purchase", "rental"] as const)(
    "loads paginated %s summaries with minimal clients and document metadata",
    async (type) => {
      const result: BillingOperationPageDTO = {
        page: 1,
        limit: 10,
        total: 1,
        operations: [
          {
            id: 42,
            clientId: 1,
            type,
            date: 1790856000000,
            serviceStartAt: 1790856000000,
            serviceEndAt: 1793444400000,
            closedAt: 1793444400000,
            comment: null,
            status: "paid",
            paymentMethod: "free",
            paidAt: 1793444400000,
            client: {
              firstname: "Ada",
              lastname: "Lovelace",
              email: "ada@example.test",
            },
            snapshots: [
              {
                kind: "invoice",
                status: "paid",
                paymentMethod: "free",
                paidAt: 1793444400000,
                createdAt: 1793444400000,
                updatedAt: 1793444400000,
              },
            ],
          },
        ],
      };
      globalThis.fetch = Object.assign(
        async (input: RequestInfo | URL) => {
          const url = new URL(String(input));
          expect(url.pathname).toBe("/operations");
          expect(Object.fromEntries(url.searchParams)).toEqual({
            type,
            page: "1",
            limit: "10",
          });
          return Response.json(result);
        },
        { preconnect: originalFetch.preconnect },
      );
      expect(await getOperations({ type, page: 1, limit: 10 })).toEqual(result);
    },
  );

  it.each(["repair", "sale", "purchase", "rental"] as const)(
    "sends the %s quote choice and multiline comment in a single request",
    async (type) => {
      const calls: { url: string; body: unknown }[] = [];
      globalThis.fetch = Object.assign(
        async (input: RequestInfo | URL, init: RequestInit = {}) => {
          calls.push({
            url: String(input),
            body: JSON.parse(String(init.body)),
          });
          return Response.json({ id: 1 });
        },
        { preconnect: originalFetch.preconnect },
      );
      for (const createQuote of [true, false]) {
        const input = {
          clientId: 1,
          type,
          createQuote,
          date: "2026-10-31T12:00:00Z",
          ...(type === "rental" && {
            serviceStartAt: "2026-11-01T00:00:00Z",
            serviceEndAt: "2026-11-03T23:59:59Z",
          }),
          comment: "First line\nSecond line",
          lines: [
            {
              description: "Discount",
              quantity: "1",
              unitPrice: "-10.00",
              vatRate: "20",
              total: "-12.00",
            },
          ],
        };
        await createOperation(input);
        expect(calls.at(-1)?.body).toEqual(input);
        expect(new URL(calls.at(-1)?.url ?? "").pathname).toBe("/operations");
      }
      expect(calls).toHaveLength(2);
    },
  );
});
