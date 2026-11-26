import { describe, expect, it } from "bun:test";
import {
  cookieValue,
  createHarness,
  expectAuthResponse,
  expectError,
} from "./helpers";

describe("POST /auth/refresh", () => {
  it("refreshes a valid session and rejects invalid tokens", async () => {
    const { login, request } = createHarness();
    const loggedIn = await login();
    const initialBody = await loggedIn.json();
    const cookie = cookieValue(loggedIn.headers.get("set-cookie"));
    const refreshed = await request("/auth/refresh", {
      method: "POST",
      headers: { Cookie: cookie },
    });
    expect(refreshed.status).toBe(200);
    expect(refreshed.headers.get("set-cookie")).toContain("Secure");
    expectAuthResponse(await refreshed.json(), initialBody.user);

    await expectError(
      await request("/auth/refresh", {
        method: "POST",
        headers: { Cookie: "refresh_token=invalid" },
      }),
      401,
      "INVALID_AUTH_TOKEN",
      "Invalid token",
    );
  });
});
