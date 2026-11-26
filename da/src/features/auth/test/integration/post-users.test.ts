import { describe, expect, it } from "bun:test";
import { accessTokenFrom } from "../../../../tests-helpers/authCookies";
import {
  type AuthIntegrationFixture,
  registerAuthIntegrationFixture,
} from "./helpers";

let app: AuthIntegrationFixture["app"];
let users: AuthIntegrationFixture["users"];
let headers: AuthIntegrationFixture["headers"];
let login: AuthIntegrationFixture["login"];

registerAuthIntegrationFixture("auth-integration-post-users", (fixture) => {
  app = fixture.app;
  users = fixture.users;
  headers = fixture.headers;
  login = fixture.login;
});

describe("auth HTTP integration — post-users", () => {
  it("persists users created through the HTTP route", async () => {
    const loginResponse = await login();
    const response = await app.handle(
      new Request("http://localhost/users", {
        method: "POST",
        headers: headers({
          Cookie: `access_token=${accessTokenFrom(loginResponse)}`,
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          email: "created@example.com",
          firstname: "Created",
          lastname: "User",
          password: "StrongPasswordSecure",
          role: "Subadmin",
        }),
      }),
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    const storedUser = await users.findByEmail("created@example.com");
    expect(body.id).toBe(storedUser?.id);
    expect(storedUser).toMatchObject({
      email: "created@example.com",
      firstname: "Created",
      lastname: "User",
      role: "Subadmin",
      isActive: true,
      mustChangePassword: true,
    });
  });
});
