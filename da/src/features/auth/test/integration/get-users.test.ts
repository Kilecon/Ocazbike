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
let users: AuthIntegrationFixture["users"];
let user: User;
let inactiveUser: User;
let headers: AuthIntegrationFixture["headers"];
let login: AuthIntegrationFixture["login"];

beforeAll(() => {
  fixture = createAuthIntegrationFixture("auth-integration-get-users");
  app = fixture.app;
  users = fixture.users;
  headers = fixture.headers;
  login = fixture.login;
});

beforeEach(async () => {
  await fixture.reset();
  user = fixture.user;
  inactiveUser = fixture.inactiveUser;
});

afterAll(() => fixture?.cleanup());

describe("auth HTTP integration — get-users", () => {
  it("filters user listing to active accounts by default", async () => {
    const loginResponse = await login();
    const tokens = await loginResponse.json();
    const authorization = `Bearer ${tokens.accessToken}`;
    const defaultResponse = await app.handle(
      new Request("http://localhost/users", {
        headers: headers({ Authorization: authorization }),
      }),
    );
    const allResponse = await app.handle(
      new Request("http://localhost/users?activeOnly=false", {
        headers: headers({ Authorization: authorization }),
      }),
    );

    expect(defaultResponse.status).toBe(200);
    const activeUsers = await defaultResponse.json();
    expect(activeUsers.map(({ id }: { id: number }) => id)).toEqual([user.id]);
    expect(
      activeUsers.every(({ isActive }: { isActive: boolean }) => isActive),
    ).toBe(true);
    expect(allResponse.status).toBe(200);
    const allUsers = await allResponse.json();
    expect(allUsers.map(({ id }: { id: number }) => id)).toEqual([
      user.id,
      inactiveUser.id,
    ]);
    expect(
      allUsers.map(({ isActive }: { isActive: boolean }) => isActive),
    ).toEqual([true, false]);
  });

  it("filters and paginates users stored in SQLite through HTTP", async () => {
    const now = Date.now();
    const pageUserIds: number[] = [];
    for (let index = 0; index < 10; index += 1) {
      const pageUser = await users.create({
        email: `page-${index}@example.com`,
        firstname: `Page${index}`,
        lastname: "User",
        passwordHash: "integration-password-hash",
        role: "Subadmin",
        isActive: true,
        mustChangePassword: false,
        lastLoginAtEpochMs: null,
        createdAtEpochMs: now,
        updatedAtEpochMs: now,
      });
      pageUserIds.push(pageUser.id);
    }

    const loginResponse = await login();
    const tokens = await loginResponse.json();
    const authorization = `Bearer ${tokens.accessToken}`;
    const firstPage = await app.handle(
      new Request("http://localhost/users?activeOnly=false&page=1&limit=10", {
        headers: headers({ Authorization: authorization }),
      }),
    );
    const secondPage = await app.handle(
      new Request("http://localhost/users?activeOnly=false&page=2&limit=10", {
        headers: headers({ Authorization: authorization }),
      }),
    );
    expect(firstPage.status).toBe(200);
    expect(
      (await firstPage.json()).map(({ id }: { id: number }) => id),
    ).toEqual([user.id, inactiveUser.id, ...pageUserIds.slice(0, 8)]);
    expect(secondPage.status).toBe(200);
    expect(
      (await secondPage.json()).map(({ id }: { id: number }) => id),
    ).toEqual(pageUserIds.slice(8));
  });
});
