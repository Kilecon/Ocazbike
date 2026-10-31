import { request } from "./api-client";
import type {
  AuthSession,
  CurrentUser,
  ManagedUser,
  PublicUser,
} from "./types";

export function login(email: string, password: string): Promise<AuthSession> {
  return request<AuthSession>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function getCurrentUser(): Promise<CurrentUser> {
  return request<CurrentUser>("/auth/me");
}

export function changeInitialPassword(
  currentPassword: string,
  password: string,
): Promise<void> {
  return request<void>("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, password }),
  });
}

export function logout(): Promise<void> {
  return request<void>("/auth/logout", { method: "POST" });
}

export interface CreateUserInput {
  email: string;
  firstname: string;
  lastname: string;
  password: string;
  role: "Admin" | "Subadmin";
}

export function listUsers(
  activeOnly = true,
  page = 1,
  limit = 10,
): Promise<ManagedUser[]> {
  const params = new URLSearchParams({
    activeOnly: String(activeOnly),
    page: String(page),
    limit: String(limit),
  });
  return request<ManagedUser[]>(`/users?${params.toString()}`);
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
