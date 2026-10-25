import { afterEach, describe, expect, it, spyOn } from "bun:test";
import { ensureBootstrapAdmin } from "../../bootstrapAdmin";
import { createAuthFixture, makeUser } from "./helpers";

describe("ensureBootstrapAdmin", () => {
  afterEach(() => {
    Date.now = originalDateNow;
  });

  const originalDateNow = Date.now;

  it("creates the initial administrator with a forced password change", async () => {
    const fixture = createAuthFixture([]);
    const nowSpy = spyOn(Date, "now").mockReturnValue(1234);
    await ensureBootstrapAdmin(fixture.users);
    expect(fixture.users.create).toHaveBeenCalledWith({
      email: "admin@example.com",
      firstname: "Admin",
      lastname: "Admin",
      passwordHash:
        "$2b$12$XJ/nC2KeJfh4vSSUQmrPiOOdYv1g5kyCFV3hHgB207.pBtWMEh1zi",
      role: "Admin",
      isActive: true,
      mustChangePassword: true,
      lastLoginAtEpochMs: null,
      createdAtEpochMs: 1234,
      updatedAtEpochMs: 1234,
    });
    nowSpy.mockRestore();
  });

  it("promotes an existing bootstrap user instead of creating a duplicate", async () => {
    const fixture = createAuthFixture([
      makeUser({ id: 5, email: "admin@example.com", role: "Subadmin" }),
    ]);
    const nowSpy = spyOn(Date, "now").mockReturnValue(5678);
    await ensureBootstrapAdmin(fixture.users);

    expect(fixture.users.setRole).toHaveBeenCalledWith(5, "Admin", 5678);
    expect(fixture.users.create).not.toHaveBeenCalled();
    nowSpy.mockRestore();
  });
});
