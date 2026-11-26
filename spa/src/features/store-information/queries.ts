import { queryOptions, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { getStoreInformation } from "./api";
import type { StoreInformation } from "./types";

export const storeInformationQuery = () =>
  queryOptions({
    queryKey: ["store-information"],
    queryFn: ({ signal }) => getStoreInformation(signal),
  });

export function useStoreInformationSaved() {
  const queryClient = useQueryClient();
  return useCallback(
    (information: StoreInformation) =>
      queryClient.setQueryData(storeInformationQuery().queryKey, information),
    [queryClient],
  );
}
