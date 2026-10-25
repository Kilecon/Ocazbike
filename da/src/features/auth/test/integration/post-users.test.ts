import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "bun:test";
import {
  type AuthIntegrationFixture,
  createAuthIntegrationFixture,
} from "./helpers";

let fixture: AuthIntegrationFixture;
let app: AuthIntegrationFixture["app"];
let users: AuthIntegrationFixture["users"];
let headers: AuthIntegrationFixture["headers"];
let login: AuthIntegrationFixture["login"];

beforeAll(() => {
  fixture = createAuthIntegrationFixture("auth-integration-post-users");
  app = fixture.app;
  users = fixture.users;
  headers = fixture.headers;
  login = fixture.login;
});

beforeEach(async () => {
  await fixture.reset();
});

afterAll(() => fixture?.cleanup());

describe("auth HTTP integration — post-users", () => {
  it("persists users created through the HTTP route", async () => {
    const loginResponse = await login();
    const tokens = await loginResponse.json();
    const response = await app.handle(
      new Request("http://localhost/users", {
        method: "POST",
        headers: headers({
          Authorization: `Bearer ${tokens.accessToken}`,
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
