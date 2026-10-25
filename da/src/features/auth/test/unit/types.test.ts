import { describe, expect, it } from "bun:test";
import { toPublicUser, type User } from "../../types";

describe("toPublicUser", () => {
  it("returns public account fields without credentials or timestamps", () => {
    const user: User = {
      id: 7,
      email: "admin@example.com",
      firstname: "Ada",
      lastname: "Admin",
      passwordHash: "secret-hash",
      role: "Admin",
      isActive: true,
      mustChangePassword: false,
      lastLoginAtEpochMs: 10,
      createdAtEpochMs: 20,
      updatedAtEpochMs: 30,
    };
    expect(toPublicUser(user)).toEqual({
      id: 7,
      email: "admin@example.com",
      firstname: "Ada",
      lastname: "Admin",
      role: "Admin",
      isActive: true,
      mustChangePassword: false,
    });
  });
});
