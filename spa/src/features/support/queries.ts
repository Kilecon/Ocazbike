import {
  keepPreviousData,
  queryOptions,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback } from "react";
import { listSupportRequests, type SupportRequestListParams } from "./api";
import type { SupportRequestDTO, SupportRequestPageDTO } from "./types";

export const supportKeys = {
  all: ["support"] as const,
  list: (params: SupportRequestListParams) =>
    [...supportKeys.all, "list", params] as const,
};

export const supportRequestsQuery = (params: SupportRequestListParams) =>
  queryOptions({
    queryKey: supportKeys.list(params),
    queryFn: ({ signal }) => listSupportRequests(params, signal),
    placeholderData: keepPreviousData,
  });

export function useSupportRequestsChanged() {
  const queryClient = useQueryClient();
  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: supportKeys.all }),
    [queryClient],
  );
  /** Replaces one request in every cached page without refetching. */
  const replace = useCallback(
    (updated: SupportRequestDTO) =>
      queryClient.setQueriesData<SupportRequestPageDTO>(
        { queryKey: [...supportKeys.all, "list"] },
        (page) =>
          page && {
            ...page,
            requests: page.requests.map((request) =>
              request.id === updated.id ? updated : request,
            ),
          },
      ),
    [queryClient],
  );
  return { refresh, replace };
}
