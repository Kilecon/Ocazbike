import { afterEach, describe, expect, it, spyOn } from "bun:test";
import { ok } from "node:assert/strict";
import { ensureBootstrapAdmin } from "../../bootstrapAdmin";
import { BcryptPasswordHasher } from "../../password";
import { createAuthFixture, makeUser } from "./helpers";

const passwords = new BcryptPasswordHasher(4);
const env = { BOOTSTRAP_ADMIN_PASSWORD: "test-bootstrap-password" };

describe("ensureBootstrapAdmin", () => {
  afterEach(() => {
    Date.now = originalDateNow;
  });

  const originalDateNow = Date.now;

  it("creates the initial administrator with a forced password change", async () => {
    const fixture = createAuthFixture([]);
    const nowSpy = spyOn(Date, "now").mockReturnValue(1234);
    await ensureBootstrapAdmin(fixture.users, passwords, env);
    expect(fixture.users.create).toHaveBeenCalledWith({
      email: "admin@example.com",
      firstname: "Admin",
      lastname: "Admin",
      passwordHash: expect.stringMatching(/^\$2[aby]\$/),
      role: "Admin",
      isActive: true,
      mustChangePassword: true,
      lastLoginAtEpochMs: null,
      createdAtEpochMs: 1234,
      updatedAtEpochMs: 1234,
    });
    const input = fixture.users.create.mock.calls[0]?.[0];
    ok(input);
    expect(
      await passwords.compare(env.BOOTSTRAP_ADMIN_PASSWORD, input.passwordHash),
    ).toBe(true);
    nowSpy.mockRestore();
  });

  it("promotes an existing bootstrap user instead of creating a duplicate", async () => {
    const fixture = createAuthFixture([
      makeUser({ id: 5, email: "admin@example.com", role: "Subadmin" }),
    ]);
    const nowSpy = spyOn(Date, "now").mockReturnValue(5678);
    await ensureBootstrapAdmin(fixture.users, passwords, {});

    expect(fixture.users.setRole).toHaveBeenCalledWith(5, "Admin", 5678);
    expect(fixture.users.create).not.toHaveBeenCalled();
    nowSpy.mockRestore();
  });

  it.each([undefined, "", "too-short"])(
    "refuses an invalid initial password: %s",
    async (password) => {
      const fixture = createAuthFixture([]);
      await expect(
        ensureBootstrapAdmin(fixture.users, passwords, {
          BOOTSTRAP_ADMIN_PASSWORD: password,
        }),
      ).rejects.toThrow("BOOTSTRAP_ADMIN_PASSWORD");
      expect(fixture.users.create).not.toHaveBeenCalled();
    },
  );
});
