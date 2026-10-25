import type { UserRepository } from "./repositories";

const ADMIN_EMAIL = "admin@example.com";
const ADMIN_PASSWORD_HASH =
  "$2b$12$XJ/nC2KeJfh4vSSUQmrPiOOdYv1g5kyCFV3hHgB207.pBtWMEh1zi";

export async function ensureBootstrapAdmin(
  users: UserRepository,
): Promise<void> {
  const timestampMs = Date.now();
  const existing = await users.findByEmail(ADMIN_EMAIL);
  if (existing) {
    await users.setRole(existing.id, "Admin", timestampMs);
    return;
  }

  await users.create({
    email: ADMIN_EMAIL,
    firstname: "Admin",
    lastname: "Admin",
    passwordHash: ADMIN_PASSWORD_HASH,
    role: "Admin",
    isActive: true,
    mustChangePassword: true,
    lastLoginAtEpochMs: null,
    createdAtEpochMs: timestampMs,
    updatedAtEpochMs: timestampMs,
  });
}
