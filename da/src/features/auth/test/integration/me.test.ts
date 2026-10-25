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
} from "./helpers";

let fixture: AuthIntegrationFixture;
let app: AuthIntegrationFixture["app"];
let user: User;
let headers: AuthIntegrationFixture["headers"];
let login: AuthIntegrationFixture["login"];

beforeAll(() => {
  fixture = createAuthIntegrationFixture("auth-integration-me");
  app = fixture.app;
  headers = fixture.headers;
  login = fixture.login;
});

beforeEach(async () => {
  await fixture.reset();
  user = fixture.user;
});

afterAll(() => fixture?.cleanup());

describe("auth HTTP integration — me", () => {
  it("returns the last login timestamp from /auth/me", async () => {
    const loginResponse = await login();
    const tokens = await loginResponse.json();
    const response = await app.handle(
      new Request("http://localhost/auth/me", {
        headers: headers({
          Authorization: `Bearer ${tokens.accessToken}`,
        }),
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      email: user.email,
      firstname: user.firstname,
      lastname: user.lastname,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      lastLoginAtEpochMs: expect.any(Number),
    });
    expect(Number.isSafeInteger(body.lastLoginAtEpochMs)).toBe(true);
    expect(body.lastLoginAtEpochMs).toBeGreaterThan(
      Date.UTC(2026, 9, 20, 19, 44, 6),
    );
  });
});
