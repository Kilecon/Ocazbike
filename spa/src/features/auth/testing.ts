import type { CurrentUser } from "./types";

export const admin = {
  id: 1,
  email: "admin@example.test",
  firstname: "Ada",
  lastname: "Admin",
  role: "Admin",
  mustChangePassword: false,
  lastLoginAtEpochMs: null,
} as const satisfies CurrentUser & { id: number };
