import { describe, expect, it } from "bun:test";
import type { User } from "../../types";
import {
  type AuthIntegrationFixture,
  expectAuthResponse,
  expectedPublicUser,
  registerAuthIntegrationFixture,
} from "./helpers";

let app: AuthIntegrationFixture["app"];
let user: User;
let headers: AuthIntegrationFixture["headers"];
let login: AuthIntegrationFixture["login"];

registerAuthIntegrationFixture("auth-integration-refresh", (fixture) => {
  app = fixture.app;
  headers = fixture.headers;
  login = fixture.login;
  user = fixture.user;
});

describe("auth HTTP integration — refresh", () => {
  it("rotates refresh tokens and rejects a replay", async () => {
    const loginResponse = await login();
    const loginBody = await loginResponse.json();
    expectAuthResponse(loginBody, expectedPublicUser(user));
    const refreshCookieOf = (response: Response) =>
      response.headers
        .getSetCookie()
        .find((value) => value.startsWith("refresh_token="))
        ?.split(";")[0] ?? "";
    const cookie = refreshCookieOf(loginResponse);
    expect(cookie).toStartWith("refresh_token=");
    const refresh = () =>
      app.handle(
        new Request("http://localhost/auth/refresh", {
          method: "POST",
          headers: headers({ Cookie: cookie }),
        }),
      );

    const refreshed = await refresh();
    expect(refreshed.status).toBe(200);
    const refreshedBody = await refreshed.json();
    expectAuthResponse(refreshedBody, expectedPublicUser(user));
    expect(refreshed.headers.get("set-cookie")).toContain("HttpOnly");
    expect(refreshed.headers.get("set-cookie")).toContain("access_token=");
    expect(refreshCookieOf(refreshed)).not.toBe(cookie);
    expect((await refresh()).status).toBe(401);
  });
});
