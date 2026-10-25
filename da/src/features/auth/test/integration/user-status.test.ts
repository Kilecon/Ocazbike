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
import { User } from "../../types";

let fixture: AuthIntegrationFixture;
let app: AuthIntegrationFixture["app"];
let users: AuthIntegrationFixture["users"];
let inactiveUser: User;
let headers: AuthIntegrationFixture["headers"];
let login: AuthIntegrationFixture["login"];

beforeAll(() => {
  fixture = createAuthIntegrationFixture("auth-integration-user-status");
  app = fixture.app;
  users = fixture.users;
  headers = fixture.headers;
  login = fixture.login;
});

beforeEach(async () => {
  await fixture.reset();
  inactiveUser = fixture.inactiveUser;
});

afterAll(() => fixture?.cleanup());

describe("auth HTTP integration — user-status", () => {
  it("allows admins to deactivate and reactivate users by ID", async () => {
    const loginResponse = await login();
    const tokens = await loginResponse.json();
    const authorization = `Bearer ${tokens.accessToken}`;
    const activate = await app.handle(
      new Request(`http://localhost/users/${inactiveUser.id}/activate`, {
        method: "PATCH",
        headers: headers({ Authorization: authorization }),
      }),
    );
    expect(activate.status).toBe(204);
    expect((await users.findById(inactiveUser.id))?.isActive).toBe(true);

    const deactivate = await app.handle(
      new Request(`http://localhost/users/${inactiveUser.id}/deactivate`, {
        method: "PATCH",
        headers: headers({ Authorization: authorization }),
      }),
    );
    expect(deactivate.status).toBe(204);
    expect((await users.findById(inactiveUser.id))?.isActive).toBe(false);

    const reactivate = await app.handle(
      new Request(`http://localhost/users/${inactiveUser.id}/activate`, {
        method: "PATCH",
        headers: headers({ Authorization: authorization }),
      }),
    );
    expect(reactivate.status).toBe(204);
    expect((await users.findById(inactiveUser.id))?.isActive).toBe(true);
  });
});
