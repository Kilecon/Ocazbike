import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "bun:test";
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
    const response = await app.handle(
      new Request("http://localhost/public/empty"),
    );
    expect(response.status).toBe(403);
  });

  it("serves the public empty route without a JWT", async () => {
    const response = await app.handle(
      new Request("http://localhost/public/empty", { headers: headers() }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });

  it("protects the private empty route with a JWT", async () => {
    const unauthorized = await app.handle(
      new Request("http://localhost/private/empty", { headers: headers() }),
    );
    expect(unauthorized.status).toBe(401);

    const response = await login();
    expect(response.status).toBe(200);
    const tokens = await response.json();
    expectAuthResponse(tokens, expectedPublicUser(user));
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");

    const privateResponse = await app.handle(
      new Request("http://localhost/private/empty", {
        headers: headers({ Authorization: `Bearer ${tokens.accessToken}` }),
      }),
    );
    expect(privateResponse.status).toBe(200);
    expect(await privateResponse.json()).toEqual([]);
  });

  it("rejects a modified access-token payload", async () => {
    const loginResponse = await login();
    const tokens = await loginResponse.json();
    const [header, payload, signature] = tokens.accessToken.split(".");
    const alteredPayload = Buffer.from(
      JSON.stringify({
        ...JSON.parse(Buffer.from(payload, "base64url").toString()),
        sub: "8",
      }),
    ).toString("base64url");
    const response = await app.handle(
      new Request("http://localhost/auth/me", {
        headers: headers({
          Authorization: `Bearer ${header}.${alteredPayload}.${signature}`,
        }),
      }),
    );

    expect(response.status).toBe(401);
  });
});
