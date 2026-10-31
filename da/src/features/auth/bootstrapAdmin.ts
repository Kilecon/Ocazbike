import type { IUserRepository } from "./IAuthRepositories";
import type { PasswordHasher } from "./password";

const ADMIN_EMAIL = "admin@example.com";

export async function ensureBootstrapAdmin(
  users: IUserRepository,
  passwords: PasswordHasher,
  env: Record<string, string | undefined> = process.env,
): Promise<void> {
  const timestampMs = Date.now();
  const existing = await users.findByEmail(ADMIN_EMAIL);
  if (existing) {
    await users.setRole(existing.id, "Admin", timestampMs);
    return;
  }

  const ADMIN_PASSWORD = env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 12) {
    throw new Error(
      "BOOTSTRAP_ADMIN_PASSWORD must contain at least 12 characters to create the initial administrator",
    );
  }

  await users.create({
    email: ADMIN_EMAIL,
    firstname: "Admin",
    lastname: "Admin",
    passwordHash: await passwords.hash(ADMIN_PASSWORD),
    role: "Admin",
    isActive: true,
    mustChangePassword: true,
    lastLoginAtEpochMs: null,
    createdAtEpochMs: timestampMs,
    updatedAtEpochMs: timestampMs,
  });
}
