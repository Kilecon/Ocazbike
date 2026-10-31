import { describe, expect, it } from "bun:test";
import { accessTokenFrom } from "../../../../test-support/authCookies";
import { createHarness, expectError, json } from "./helpers";

describe("POST /auth/change-password", () => {
  it("changes a password only after validating the current password", async () => {
    const { login, request } = createHarness();
    await expectError(
      await request("/auth/change-password", {
        method: "POST",
        ...json({
          currentPassword: "StrongPasswordSecure",
          password: "AnotherSecurePassword",
        }),
      }),
      401,
      "UNAUTHORIZED",
      "Not authenticated",
    );
    await expectError(
      await request("/auth/change-password", {
        method: "POST",
        headers: { Cookie: "access_token=invalid" },
        ...json({
          currentPassword: "StrongPasswordSecure",
          password: "AnotherSecurePassword",
        }),
      }),
      401,
      "INVALID_AUTH_TOKEN",
      "Invalid token",
    );
    const loggedIn = await login();
    const accessToken = accessTokenFrom(loggedIn);
    const headers = { Cookie: `access_token=${accessToken}` };

    await expectError(
      await request("/auth/change-password", {
        method: "POST",
        headers,
        ...json({
          currentPassword: "wrong",
          password: "AnotherSecurePassword",
        }),
      }),
      400,
      "INVALID_CURRENT_PASSWORD",
      "Invalid current password",
    );
    await expectError(
      await request("/auth/change-password", {
        method: "POST",
        headers,
        ...json({ currentPassword: "StrongPasswordSecure", password: "short" }),
      }),
      400,
      "INVALID_PASSWORD",
      "Invalid password",
    );

    const changed = await request("/auth/change-password", {
      method: "POST",
      headers,
      ...json({
        currentPassword: "StrongPasswordSecure",
        password: "AnotherSecurePassword",
      }),
    });
    expect(changed.status).toBe(204);
    expect(await changed.text()).toBe("");
  });
});
