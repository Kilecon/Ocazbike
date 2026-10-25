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
let user: User;
let login: AuthIntegrationFixture["login"];

beforeAll(() => {
  fixture = createAuthIntegrationFixture("auth-integration-login");
  login = fixture.login;
});

beforeEach(async () => {
  await fixture.reset();
  user = fixture.user;
});

afterAll(() => fixture?.cleanup());

describe("auth HTTP integration — login", () => {
  it("contains only the subject and token type/expiry in the access token", async () => {
    const response = await login();
    const tokens = await response.json();
    expectAuthResponse(tokens, expectedPublicUser(user));
    const claims = JSON.parse(
      Buffer.from(tokens.accessToken.split(".")[1], "base64url").toString(),
    ) as Record<string, unknown>;

    expect(claims).toEqual({
      sub: String(user.id),
      type: "access",
      exp: expect.any(Number),
    });
    expect(claims).not.toHaveProperty("isActive");
    expect(claims).not.toHaveProperty("mustChangePassword");
    expect(claims).not.toHaveProperty("id");
    expect(claims).not.toHaveProperty("email");
    expect(claims).not.toHaveProperty("firstname");
    expect(claims).not.toHaveProperty("lastname");
    expect(claims).not.toHaveProperty("role");
  });
});
