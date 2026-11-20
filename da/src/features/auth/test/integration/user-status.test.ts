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
} from "./helpers";

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
    const authorization = `access_token=${accessTokenFrom(loginResponse)}`;
    const activate = await app.handle(
      new Request(`http://localhost/users/${inactiveUser.id}/activate`, {
        method: "PATCH",
        headers: headers({ Cookie: authorization }),
      }),
    );
    expect(activate.status).toBe(204);
    expect((await users.findById(inactiveUser.id))?.isActive).toBe(true);

    const deactivate = await app.handle(
      new Request(`http://localhost/users/${inactiveUser.id}/deactivate`, {
        method: "PATCH",
        headers: headers({ Cookie: authorization }),
      }),
    );
    expect(deactivate.status).toBe(204);
    expect((await users.findById(inactiveUser.id))?.isActive).toBe(false);

    const reactivate = await app.handle(
      new Request(`http://localhost/users/${inactiveUser.id}/activate`, {
        method: "PATCH",
        headers: headers({ Cookie: authorization }),
      }),
    );
    expect(reactivate.status).toBe(204);
    expect((await users.findById(inactiveUser.id))?.isActive).toBe(true);
  });
});
