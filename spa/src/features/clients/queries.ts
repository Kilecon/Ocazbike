import {
  keepPreviousData,
  queryOptions,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback } from "react";
import { type ClientListParams, getClient, getClientsPage } from "./api";
import type { ClientDetailDTO } from "./types";

export const clientKeys = {
  all: ["clients"] as const,
  list: (params: ClientListParams) =>
    [...clientKeys.all, "list", params] as const,
  detail: (id: number) => [...clientKeys.all, "detail", id] as const,
};

export const clientsQuery = (params: ClientListParams) =>
  queryOptions({
    queryKey: clientKeys.list(params),
    queryFn: ({ signal }) => getClientsPage(params, signal),
    placeholderData: keepPreviousData,
  });

export const clientQuery = (id: number) =>
  queryOptions({
    queryKey: clientKeys.detail(id),
    queryFn: ({ signal }) => getClient(id, signal),
  });

/** Stores a saved client and refreshes the client lists. */
export function useClientSaved() {
  const queryClient = useQueryClient();
  return useCallback(
    (client: ClientDetailDTO) => {
      queryClient.setQueryData(clientKeys.detail(client.id), client);
      return queryClient.invalidateQueries({
        queryKey: [...clientKeys.all, "list"],
      });
    },
    [queryClient],
  );
}
