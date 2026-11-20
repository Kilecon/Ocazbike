import { expect } from "bun:test";
import { ok } from "node:assert/strict";
import { DataProtector } from "../../../../shared/crypto/DataProtector";
import { createTestDatabase } from "../../../../test-support/testDatabase";
import { DrizzleClientRepository } from "../../../clients/infrastructure/DrizzleClientRepository";
import type { CreateBillingOperationInput } from "../../IBillingDocumentRepository";
import { DrizzleBillingDocumentRepository } from "../../infrastructure/DrizzleBillingDocumentRepository";

export const SAMPLES = 100;
export const OPERATIONS_PER_SAMPLE = 10;
export const ITERATIONS = SAMPLES * OPERATIONS_PER_SAMPLE;
export const P99_LIMIT_MS = 25;

export interface PerformanceContext {
  database: ReturnType<typeof createTestDatabase>;
  repository: DrizzleBillingDocumentRepository;
  clientId: number;
  operationId: number;
}

export interface Measurement {
  operation: string;
  iterations: number;
  meanMs: number;
  p99Ms: number;
  documentRows: string;
  quoteRows: string;
  invoiceRows: string;
}

export interface PerformanceCase {
  operation: string;
  prepare?: (context: PerformanceContext, index: number) => Promise<number>;
  run: (
    context: PerformanceContext,
    id: number,
    index: number,
  ) => Promise<unknown>;
}

export function makeInput(
  clientId: number,
  index = 0,
): CreateBillingOperationInput {
  return {
    clientId,
    type: "repair",
    date: "2026-10-05T12:00:00Z",
    comment: `Benchmark ${index}`,
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
}

export async function createPerformanceContext(): Promise<PerformanceContext> {
  const database = createTestDatabase("billing-performance");
  try {
    expect(database.sqlite.query("PRAGMA journal_mode").get()).toEqual({
      journal_mode: "wal",
    });
    const protector = new DataProtector(Buffer.alloc(32, 31));
    const clients = new DrizzleClientRepository(database.database, protector);
    const actor = database.sqlite
      .query(
        "INSERT INTO users (email, encryption_salt, password_hash) VALUES (?, ?, ?) RETURNING id",
      )
      .get("benchmark@example.test", "benchmark-salt", "benchmark-hash") as {
      id: number;
    };
    const client = await clients.create(
      {
        firstname: "Billing",
        lastname: "Performance",
        email: "billing-performance@example.test",
      },
      actor.id,
    );
    const repository = new DrizzleBillingDocumentRepository(
      database.database,
      protector,
      clients,
    );
    let operationId = 0;
    for (let index = 0; index < 250; index += 1) {
      const operation = await repository.createOperation({
        ...makeInput(client.id, index),
        createQuote: true,
      });
      expect(operation).not.toBeNull();
      ok(operation);
      if (index === 0) operationId = operation.id;
    }
    return { database, repository, clientId: client.id, operationId };
  } catch (error) {
    database.cleanup();
    throw error;
  }
}

function rowRange(counts: number[]): string {
  const minimum = Math.min(...counts);
  const maximum = Math.max(...counts);
  return minimum === maximum ? String(minimum) : `${minimum}-${maximum}`;
}

export async function measure(
  context: PerformanceContext,
  benchmark: PerformanceCase,
): Promise<Measurement> {
  const samples: number[] = [];
  const documents: number[] = [];
  const quotes: number[] = [];
  const invoices: number[] = [];
  for (let sample = 0; sample < SAMPLES; sample += 1) {
    const first = sample * OPERATIONS_PER_SAMPLE;
    const ids: number[] = [];
    for (let offset = 0; offset < OPERATIONS_PER_SAMPLE; offset += 1) {
      ids.push(
        benchmark.prepare
          ? await benchmark.prepare(context, first + offset)
          : context.operationId,
      );
    }
    const sizes = context.database.sqlite
      .query(
        `SELECT (SELECT COUNT(*) FROM billing_documents) AS documents,
              (SELECT COUNT(*) FROM billing_quotes) AS quotes,
              (SELECT COUNT(*) FROM billing_invoices) AS invoices`,
      )
      .get() as { documents: number; quotes: number; invoices: number };
    documents.push(sizes.documents);
    quotes.push(sizes.quotes);
    invoices.push(sizes.invoices);
    const start = performance.now();
    for (let offset = 0; offset < OPERATIONS_PER_SAMPLE; offset += 1) {
      await benchmark.run(context, ids[offset], first + offset);
    }
    samples.push((performance.now() - start) / OPERATIONS_PER_SAMPLE);
  }
  samples.sort((left, right) => left - right);
  return {
    operation: benchmark.operation,
    iterations: ITERATIONS,
    meanMs: samples.reduce((sum, sample) => sum + sample, 0) / SAMPLES,
    p99Ms: samples[Math.ceil(SAMPLES * 0.99) - 1],
    documentRows: rowRange(documents),
    quoteRows: rowRange(quotes),
    invoiceRows: rowRange(invoices),
  };
}
