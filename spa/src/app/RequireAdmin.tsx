import { Navigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useCurrentUser } from "@/features/auth/CurrentUser";

/** Admin-only pages send other staff members back to the repairs workspace. */
export function RequireAdmin({ children }: Readonly<{ children: ReactNode }>) {
  const user = useCurrentUser();
  if (user?.role !== "Admin")
    return (
      <Navigate to="/admin/$section" params={{ section: "repairs" }} replace />
    );
  return children;
}
