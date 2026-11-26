import { describe, expect, it } from "bun:test";
import { QueryClient } from "@tanstack/react-query";
import { invalidateOperations, operationKeys } from "./queries";
import { createBillingOperation } from "./testing";

function seededClient() {
  const queryClient = new QueryClient();
  const keys = [
    operationKeys.counts(),
    operationKeys.list({ type: "repair" }),
    operationKeys.detail(42),
    operationKeys.detail(7),
  ];
  for (const key of keys) queryClient.setQueryData(key, { stale: true });
  const isInvalidated = (key: readonly unknown[]) =>
    queryClient.getQueryState(key)?.isInvalidated ?? false;
  return { queryClient, isInvalidated };
}

describe("operation cache invalidation", () => {
  it("stores the returned operation and refreshes everything else", async () => {
    const { queryClient, isInvalidated } = seededClient();
    const operation = createBillingOperation({ id: 42 });

    await invalidateOperations(queryClient, operation);

    expect(queryClient.getQueryData<unknown>(operationKeys.detail(42))).toEqual(
      operation,
    );
    expect(isInvalidated(operationKeys.detail(42))).toBe(false);
    expect(isInvalidated(operationKeys.detail(7))).toBe(true);
    expect(isInvalidated(operationKeys.counts())).toBe(true);
    expect(isInvalidated(operationKeys.list({ type: "repair" }))).toBe(true);
  });

  it("refreshes every operation query when nothing is returned", async () => {
    const { queryClient, isInvalidated } = seededClient();

    await invalidateOperations(queryClient);

    expect(isInvalidated(operationKeys.detail(42))).toBe(true);
    expect(isInvalidated(operationKeys.counts())).toBe(true);
  });
});
