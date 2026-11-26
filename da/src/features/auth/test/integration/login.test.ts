import { describe, expect, it } from "bun:test";
import { accessTokenFrom } from "../../../../tests-helpers/authCookies";
import type { User } from "../../types";
import {
  type AuthIntegrationFixture,
  expectAuthResponse,
  expectedPublicUser,
  registerAuthIntegrationFixture,
} from "./helpers";

let user: User;
let login: AuthIntegrationFixture["login"];

registerAuthIntegrationFixture("auth-integration-login", (fixture) => {
  user = fixture.user;
  login = fixture.login;
});

describe("auth HTTP integration — login", () => {
  it("contains only the subject, token type and timestamps in the access token", async () => {
    const response = await login();
    expectAuthResponse(await response.json(), expectedPublicUser(user));
    const claims = JSON.parse(
      Buffer.from(
        accessTokenFrom(response).split(".")[1],
        "base64url",
      ).toString(),
    ) as Record<string, unknown>;

    expect(claims).toEqual({
      sub: String(user.id),
      type: "access",
      exp: expect.any(Number),
      iat: expect.any(Number),
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
