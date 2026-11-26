import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/shared/api/http";
import { getCurrentUser, logout } from "./api";
import type { CurrentUser } from "./types";

export type Session =
  | { status: "authenticated"; user: CurrentUser }
  | { status: "password-change-required" }
  | { status: "anonymous"; error?: "FORBIDDEN" | "loginError" };

const STAFF_ROLES = new Set(["Admin", "Subadmin"]);

async function loadSession(): Promise<Session> {
  try {
    const user = await getCurrentUser();
    if (!STAFF_ROLES.has(user.role)) {
      void logout().catch(() => {});
      return { status: "anonymous", error: "FORBIDDEN" };
    }
    if (user.mustChangePassword) return { status: "password-change-required" };
    return { status: "authenticated", user };
  } catch (error) {
    if (error instanceof ApiError && error.code === "PASSWORD_CHANGE_REQUIRED")
      return { status: "password-change-required" };
    if (error instanceof ApiError && error.status === 401)
      return { status: "anonymous" };
    return { status: "anonymous", error: "loginError" };
  }
}

export const sessionQuery = queryOptions({
  queryKey: ["session"],
  queryFn: loadSession,
  staleTime: Number.POSITIVE_INFINITY,
});

export function useSession() {
  return useQuery(sessionQuery);
}

/** Re-reads the session after login or a password change. */
export function useRefreshSession() {
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.refetchQueries({ queryKey: sessionQuery.queryKey });
    return queryClient.getQueryData(sessionQuery.queryKey);
  };
}

export function useLogout() {
  const queryClient = useQueryClient();
  return async () => {
    try {
      await logout();
    } catch {
      // Cookies are HttpOnly, so only the API can clear them.
    }
    queryClient.setQueryData(sessionQuery.queryKey, { status: "anonymous" });
    // Drop every cached server state of the previous user, except the session.
    queryClient.removeQueries({
      predicate: (query) => query.queryKey[0] !== sessionQuery.queryKey[0],
    });
  };
}
