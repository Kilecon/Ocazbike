import { describe, expect, it } from "bun:test";
import { createHarness, expectAuthResponse, expectError } from "./helpers";

describe("POST /auth/login", () => {
  it("logs in and sets an HttpOnly, Secure refresh cookie", async () => {
    const { login } = createHarness();
    const response = await login();
    const body = await response.json();
    const cookie = response.headers.get("set-cookie") ?? "";

    expect(response.status).toBe(200);
    expectAuthResponse(body, {
      id: 1,
      email: "admin@example.com",
      firstname: "Admin",
      lastname: "Contract",
      role: "Admin",
      isActive: true,
      mustChangePassword: false,
    });
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
  });

  it("rejects unknown credentials with the documented error", async () => {
    const { login } = createHarness();
    await expectError(
      await login("unknown@example.com"),
      401,
      "UNAUTHORIZED",
      "Invalid credentials",
    );
  });
});
