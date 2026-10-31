import { describe, expect, it } from "bun:test";
import { accessTokenFrom } from "../../../../test-support/authCookies";
import { cookieValue, createHarness, expectError } from "./helpers";

describe("POST /auth/logout", () => {
  it("logs out with 204, clears the cookie, and invalidates the session", async () => {
    const { login, request } = createHarness();
    const loggedIn = await login();
    const cookie = cookieValue(loggedIn.headers.get("set-cookie"));
    const accessToken = accessTokenFrom(loggedIn);
    const response = await request("/auth/logout", {
      method: "POST",
      headers: { Cookie: `access_token=${accessToken}; ${cookie}` },
    });

    expect(response.status).toBe(204);
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
    expect(await response.text()).toBe("");
    await expectError(
      await request("/auth/refresh", {
        method: "POST",
        headers: { Cookie: cookie },
      }),
      401,
      "INVALID_AUTH_TOKEN",
      "Invalid token",
    );
  });

  it("requires authentication to log out", async () => {
    const { request } = createHarness();
    await expectError(
      await request("/auth/logout", { method: "POST" }),
      401,
      "UNAUTHORIZED",
      "Not authenticated",
    );
  });
});
