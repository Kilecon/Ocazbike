import { expect } from "bun:test";
import { ok } from "node:assert/strict";
import type { PerformanceCase, PerformanceContext } from "./harness";
import { makeInput } from "./harness";

async function pending(context: PerformanceContext, index: number) {
  const operation = await context.repository.createOperation({
    ...makeInput(context.clientId, index),
    createQuote: true,
  });
  expect(operation?.status).toBe("pending");
  ok(operation);
  return operation.id;
}

async function ongoing(context: PerformanceContext, index: number) {
  const operation = await context.repository.createOperation(
    makeInput(context.clientId, index),
  );
  expect(operation?.status).toBe("in_progress");
  ok(operation);
  return operation.id;
}

async function invoiced(context: PerformanceContext, index: number) {
  const id = await ongoing(context, index);
  await context.repository.completeOperation(id);
  return id;
}

export const cases: PerformanceCase[] = [
  {
    operation: "countOperations",
    run: ({ repository }) => repository.countOperations(),
  },
  {
    operation: "getOperation",
    run: ({ repository }, id) => repository.getOperation(id),
  },
  {
    operation: "listOperations",
    run: ({ repository }) =>
      repository.listOperations({
        type: "repair",
        statuses: ["pending"],
        page: 1,
        limit: 10,
      }),
  },
  {
    operation: "listOperations.clientId",
    run: ({ repository, clientId }) =>
      repository.listOperations({
        clientId,
        type: "repair",
        page: 1,
        limit: 10,
      }),
  },
  {
    operation: "listOperations.search",
    run: ({ repository }) =>
      repository.listOperations({
        search: "Billing Performance",
        page: 1,
        limit: 10,
      }),
  },
  {
    operation: "createOperation",
    run: ({ repository, clientId }, _id, index) =>
      repository.createOperation({
        ...makeInput(clientId, index),
        createQuote: true,
      }),
  },
  {
    operation: "acceptQuote",
    prepare: pending,
    run: ({ repository }, id) => repository.acceptQuote(id),
  },
  {
    operation: "rejectQuote",
    prepare: pending,
    run: ({ repository }, id) => repository.rejectQuote(id),
  },
  {
    operation: "completeOperation",
    prepare: ongoing,
    run: ({ repository }, id) => repository.completeOperation(id),
  },
  {
    operation: "payOperation",
    prepare: invoiced,
    run: ({ repository }, id) => repository.payOperation(id, "cash"),
  },
];
