import { queryOptions, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { getUserCounts, listUsers, type UserStatus } from "./api";

export const userKeys = {
  all: ["users"] as const,
  counts: () => [...userKeys.all, "counts"] as const,
  list: (params: { status: UserStatus; page: number; pageSize: number }) =>
    [...userKeys.all, "list", params] as const,
};

export const usersQuery = (params: {
  status: UserStatus;
  page: number;
  pageSize: number;
}) =>
  queryOptions({
    queryKey: userKeys.list(params),
    queryFn: ({ signal }) =>
      listUsers(false, params.page, params.pageSize, params.status, signal),
    refetchOnWindowFocus: true,
  });

export const userCountsQuery = () =>
  queryOptions({
    queryKey: userKeys.counts(),
    queryFn: ({ signal }) => getUserCounts(signal),
    refetchOnWindowFocus: true,
  });

export function useUsersChanged() {
  const queryClient = useQueryClient();
  return useCallback(
    () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
    [queryClient],
  );
}
