import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { cases } from "./cases";
import {
  createPerformanceContext,
  ITERATIONS,
  measure,
  P99_LIMIT_MS,
  type PerformanceContext,
} from "./harness";

let context: PerformanceContext;
beforeAll(async () => {
  context = await createPerformanceContext();
});
afterAll(() => context?.database.cleanup());

describe("billing repository SQLite performance", () => {
  it("measures every repository method and reports row counts, mean and p99", async () => {
    const results = [];
    for (const benchmark of cases)
      results.push(await measure(context, benchmark));
    console.table(
      results.map((result) => ({
        operation: result.operation,
        iterations: result.iterations,
        "billing_documents rows": result.documentRows,
        "billing_quotes rows": result.quoteRows,
        "billing_invoices rows": result.invoiceRows,
        "mean (ms)": result.meanMs.toFixed(3),
        "p99 (ms)": result.p99Ms.toFixed(3),
      })),
    );
    expect(results).toHaveLength(cases.length);
    for (const result of results) {
      expect(result.iterations).toBe(ITERATIONS);
      expect(Number.isFinite(result.meanMs)).toBe(true);
      expect(Number.isFinite(result.p99Ms)).toBe(true);
      const limit = result.operation.startsWith("listOperations")
        ? 3
        : P99_LIMIT_MS;
      expect(result.p99Ms).toBeLessThanOrEqual(limit);
    }
  }, 120_000);
});
