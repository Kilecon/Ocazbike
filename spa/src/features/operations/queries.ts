import {
  keepPreviousData,
  type QueryClient,
  queryOptions,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback } from "react";
import {
  getOperation,
  getOperationCounts,
  getOperations,
  type OperationListParams,
} from "./api";
import type { BillingOperationDTO } from "./types";

export const operationKeys = {
  all: ["operations"] as const,
  counts: () => [...operationKeys.all, "counts"] as const,
  list: (params: OperationListParams) =>
    [...operationKeys.all, "list", params] as const,
  detail: (id: number) => [...operationKeys.all, "detail", id] as const,
};

export const operationCountsQuery = () =>
  queryOptions({
    queryKey: operationKeys.counts(),
    queryFn: ({ signal }) => getOperationCounts(signal),
    refetchOnWindowFocus: true,
  });

export const operationsQuery = (params: OperationListParams) =>
  queryOptions({
    queryKey: operationKeys.list(params),
    queryFn: ({ signal }) => getOperations({ ...params, signal }),
    placeholderData: keepPreviousData,
  });

export const operationQuery = (id: number) =>
  queryOptions({
    queryKey: operationKeys.detail(id),
    queryFn: ({ signal }) => getOperation(id, signal),
  });

export function useOperationCountsQuery() {
  return useQuery(operationCountsQuery());
}

/**
 * Refreshes every operation list, total and count after a change. A returned
 * operation is stored as-is instead of being fetched again.
 */
export function invalidateOperations(
  queryClient: QueryClient,
  operation?: BillingOperationDTO,
) {
  const freshKey = operation?.id
    ? operationKeys.detail(operation.id)
    : undefined;
  if (freshKey && operation) {
    queryClient.setQueryData(freshKey, operation);
  }
  return queryClient.invalidateQueries({
    queryKey: operationKeys.all,
    predicate: ({ queryKey }) => queryKey.join() !== freshKey?.join(),
  });
}

export function useOperationsChanged() {
  const queryClient = useQueryClient();
  return useCallback(
    (operation?: BillingOperationDTO) =>
      invalidateOperations(queryClient, operation),
    [queryClient],
  );
}
