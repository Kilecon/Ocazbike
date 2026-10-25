import { describe, expect, it } from "bun:test";
import { Elysia } from "elysia";
import {
  authGuard,
  protectedRoutes,
  readAuthUserId,
  requireAdmin,
  requireAuth,
} from "../../authorization";
import {
  AuthenticationError,
  ForbiddenRoleError,
  InvalidAuthTokenError,
  PasswordChangeRequiredError,
} from "../../errors";
import { createAuthFixture, makeUser } from "./helpers";

describe("auth authorization helpers", () => {
  it("requires a non-empty Bearer token", async () => {
    const { jwt, users } = createAuthFixture();
    const guard = requireAuth(jwt, users);
    await expect(
      guard({ request: new Request("http://localhost") }),
    ).rejects.toBeInstanceOf(AuthenticationError);
    await expect(
      guard({
        request: new Request("http://localhost", {
          headers: { Authorization: "Bearer   " },
        }),
      }),
    ).rejects.toBeInstanceOf(AuthenticationError);
    await expect(
      guard({
        request: new Request("http://localhost", {
          headers: { Authorization: "Basic token" },
        }),
      }),
    ).rejects.toBeInstanceOf(AuthenticationError);
  });

  it("rejects invalid, missing-user, inactive-user, and password-change tokens", async () => {
    const fixture = createAuthFixture();
    const guard = requireAuth(fixture.jwt, fixture.users);
    const requestFor = (token: string) =>
      new Request("http://localhost", {
        headers: { Authorization: `Bearer ${token}` },
      });

    await expect(
      guard({ request: requestFor("invalid") }),
    ).rejects.toBeInstanceOf(InvalidAuthTokenError);
    const absentUserToken = fixture.jwt.signAccessToken(99, 60);
    await expect(
      guard({ request: requestFor(absentUserToken) }),
    ).rejects.toBeInstanceOf(InvalidAuthTokenError);

    fixture.userRecords.set(1, makeUser({ isActive: false }));
    await expect(
      guard({ request: requestFor(fixture.jwt.signAccessToken(1, 60)) }),
    ).rejects.toBeInstanceOf(InvalidAuthTokenError);

    fixture.userRecords.set(1, makeUser({ mustChangePassword: true }));
    const initialPasswordToken = fixture.jwt.signAccessToken(1, 60);
    await expect(
      guard({ request: requestFor(initialPasswordToken) }),
    ).rejects.toBeInstanceOf(PasswordChangeRequiredError);
    await expect(
      requireAuth(fixture.jwt, fixture.users, {
        allowPasswordChangeRequired: true,
      })({ request: requestFor(initialPasswordToken) }),
    ).resolves.toBeUndefined();
  });

  it("requires the Admin role and reads the user id from verified claims", async () => {
    const fixture = createAuthFixture();
    const request = new Request("http://localhost", {
      headers: {
        Authorization: `Bearer ${fixture.jwt.signAccessToken(1, 60)}`,
      },
    });
    await expect(
      requireAdmin(fixture.jwt, fixture.users)({ request }),
    ).resolves.toBeUndefined();
    expect(readAuthUserId(request, fixture.jwt)).toBe(1);

    fixture.userRecords.set(1, makeUser({ role: "Subadmin" }));
    await expect(
      requireAdmin(fixture.jwt, fixture.users)({ request }),
    ).rejects.toBeInstanceOf(ForbiddenRoleError);
  });

  it("derives a sanitized public user through the auth guard", async () => {
    const fixture = createAuthFixture([
      makeUser({ mustChangePassword: false }),
    ]);
    const app = new Elysia()
      .use(authGuard(fixture.jwt, fixture.users).as("global"))
      .get("/whoami", ({ authUser }) => ({ authUser }));
    const response = await app.handle(
      new Request("http://localhost/whoami", {
        headers: {
          Authorization: `Bearer ${fixture.jwt.signAccessToken(1, 60)}`,
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      authUser: {
        id: 1,
        email: "admin@example.com",
        firstname: "Admin",
        lastname: "User",
        role: "Admin",
        isActive: true,
        mustChangePassword: false,
      },
    });
  });

  it("applies authentication through the protected routes plugin", async () => {
    const fixture = createAuthFixture();
    const app = new Elysia()
      .use(
        protectedRoutes({ appId: "test-spa" }, fixture.jwt, fixture.users).as(
          "global",
        ),
      )
      .get("/protected", () => ({ ok: true }));
    const response = await app.handle(
      new Request("http://localhost/protected", {
        headers: {
          Authorization: `Bearer ${fixture.jwt.signAccessToken(1, 60)}`,
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });
});
