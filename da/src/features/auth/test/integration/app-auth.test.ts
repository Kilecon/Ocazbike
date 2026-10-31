import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "bun:test";
import { accessTokenFrom } from "../../../../test-support/authCookies";
import type { User } from "../../types";
import {
  type AuthIntegrationFixture,
  createAuthIntegrationFixture,
  expectAuthResponse,
  expectedPublicUser,
} from "./helpers";

let fixture: AuthIntegrationFixture;
let app: AuthIntegrationFixture["app"];
let user: User;
let headers: AuthIntegrationFixture["headers"];
let login: AuthIntegrationFixture["login"];

beforeAll(() => {
  fixture = createAuthIntegrationFixture("auth-integration-app-auth");
  app = fixture.app;
  headers = fixture.headers;
  login = fixture.login;
});

beforeEach(async () => {
  await fixture.reset();
  user = fixture.user;
});

afterAll(() => fixture?.cleanup());

describe("auth HTTP integration — app-auth", () => {
  it("rejects requests without the SPA identity header", async () => {
    const response = await app.handle(new Request("http://localhost/auth/me"));
    expect(response.status).toBe(403);
  });

  it("authenticates protected routes with HttpOnly access cookies only", async () => {
    const unauthorized = await app.handle(
      new Request("http://localhost/auth/me", { headers: headers() }),
    );
    expect(unauthorized.status).toBe(401);

    const response = await login();
    expect(response.status).toBe(200);
    expectAuthResponse(await response.json(), expectedPublicUser(user));
    const cookies = response.headers.getSetCookie();
    expect(cookies).toHaveLength(2);
    expect(cookies[0]).toStartWith("access_token=");
    expect(cookies[0]).toContain("Path=/;");
    expect(cookies[1]).toStartWith("refresh_token=");
    expect(cookies[1]).toContain("Path=/auth;");
    expect(cookies.every((cookie) => cookie.includes("HttpOnly"))).toBe(true);
    expect(cookies.every((cookie) => cookie.includes("SameSite=Strict"))).toBe(
      true,
    );

    const privateResponse = await app.handle(
      new Request("http://localhost/auth/me", {
        headers: headers({
          Cookie: `access_token=${accessTokenFrom(response)}`,
        }),
      }),
    );
    expect(privateResponse.status).toBe(200);
  });

  it("rejects a modified access-token payload", async () => {
    const loginResponse = await login();
    const [header, payload, signature] =
      accessTokenFrom(loginResponse).split(".");
    const alteredPayload = Buffer.from(
      JSON.stringify({
        ...JSON.parse(Buffer.from(payload, "base64url").toString()),
        sub: "8",
      }),
    ).toString("base64url");
    const response = await app.handle(
      new Request("http://localhost/auth/me", {
        headers: headers({
          Cookie: `access_token=${header}.${alteredPayload}.${signature}`,
        }),
      }),
    );

    expect(response.status).toBe(401);
  });
});
