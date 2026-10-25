import { describe, expect, it } from "bun:test";
import { createHarness, expectError } from "./helpers";

describe("GET /auth/me", () => {
  it("returns the documented /me fields and millisecond timestamp", async () => {
    const { login, request } = createHarness();
    const loggedIn = await login();
    const { accessToken } = await loggedIn.json();
    const response = await request("/auth/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      email: "admin@example.com",
      firstname: "Admin",
      lastname: "Contract",
      role: "Admin",
      mustChangePassword: false,
      lastLoginAtEpochMs: expect.any(Number),
    });
  });

  it("returns when the user must change their password", async () => {
    const { login, request, users } = createHarness();
    const loggedIn = await login();
    const { accessToken } = await loggedIn.json();
    users.values[0].mustChangePassword = true;

    const response = await request("/auth/me", {
      headers: { Authorization: ["Bear", "er ", accessToken].join("") },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      email: "admin@example.com",
      firstname: "Admin",
      lastname: "Contract",
      role: "Admin",
      mustChangePassword: true,
      lastLoginAtEpochMs: expect.any(Number),
    });
  });

  it("returns null when /me has no previous login timestamp", async () => {
    const { login, request, users } = createHarness();
    const loggedIn = await login();
    const { accessToken } = await loggedIn.json();
    users.values[0].lastLoginAtEpochMs = null;

    const response = await request("/auth/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      email: "admin@example.com",
      firstname: "Admin",
      lastname: "Contract",
      role: "Admin",
      mustChangePassword: false,
      lastLoginAtEpochMs: null,
    });
  });

  it("rejects unauthenticated /me requests", async () => {
    const { request } = createHarness();
    await expectError(
      await request("/auth/me"),
      401,
      "UNAUTHORIZED",
      "Not authenticated",
    );
  });

  it("rejects invalid access tokens using the documented error", async () => {
    const { request } = createHarness();
    await expectError(
      await request("/auth/me", {
        headers: { Authorization: "Bearer invalid" },
      }),
      401,
      "INVALID_AUTH_TOKEN",
      "Invalid token",
    );
  });
});
