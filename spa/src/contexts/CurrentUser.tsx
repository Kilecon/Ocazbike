import { createContext, useContext } from "react";
import type { CurrentUser } from "../services/types";

export const CurrentUserContext = createContext<CurrentUser | null>(null);

export function useCurrentUser(): CurrentUser | null {
  return useContext(CurrentUserContext);
}

export function getInitials(user: CurrentUser | null): string {
  if (!user) return "";
  return `${user.firstname.charAt(0)}${user.lastname.charAt(0)}`.toUpperCase();
}

export function getFullName(user: CurrentUser | null): string {
  if (!user) return "";
  return `${user.firstname} ${user.lastname}`.trim();
}
