import type { PublicUser } from "@/features/auth/types";
import { request } from "@/shared/api/http";
import type { ManagedUser } from "./types";

export interface CreateUserInput {
  email: string;
  firstname: string;
  lastname: string;
  password: string;
  role: "Admin" | "Subadmin";
}

export type UserStatus = "all" | "active" | "inactive";
export type UserCounts = Record<UserStatus, number>;

export function listUsers(
  activeOnly = true,
  page = 1,
  limit = 10,
  status?: UserStatus,
  signal?: AbortSignal,
): Promise<ManagedUser[]> {
  const params = new URLSearchParams({
    activeOnly: String(activeOnly),
    page: String(page),
    limit: String(limit),
  });
  if (status) params.set("status", status);
  return request<ManagedUser[]>(`/users?${params.toString()}`, { signal });
}

export function getUserCounts(signal?: AbortSignal): Promise<UserCounts> {
  return request<UserCounts>("/users/counts", { signal });
}

export function setUserActive(
  userId: number,
  isActive: boolean,
): Promise<void> {
  return request<void>(
    `/users/${userId}/${isActive ? "activate" : "deactivate"}`,
    { method: "PATCH" },
  );
}

export function createUser(input: CreateUserInput): Promise<PublicUser> {
  return request<PublicUser>("/users", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
