import { describe, expect, it } from "bun:test";
import { readAuthUserId, requireAdmin, requireAuth } from "../../authorization";
import {
  AuthenticationError,
  ForbiddenRoleError,
  InvalidAuthTokenError,
  PasswordChangeRequiredError,
} from "../../errors";
import { createAuthFixture, makeUser } from "./helpers";

const requestWithCookie = (cookie?: string) =>
  new Request("http://localhost", {
    headers: cookie ? { Cookie: cookie } : {},
  });

const requestFor = (token: string) =>
  requestWithCookie(`other=1; access_token=${token}`);

describe("auth authorization helpers", () => {
  it("requires a non-empty access-token cookie", async () => {
    const { jwt, users } = createAuthFixture();
    const guard = requireAuth(jwt, users);
    await expect(
      guard({ request: requestWithCookie() }),
    ).rejects.toBeInstanceOf(AuthenticationError);
    await expect(
      guard({ request: requestWithCookie("access_token=") }),
    ).rejects.toBeInstanceOf(AuthenticationError);
    const bearerOnly = new Request("http://localhost", {
      headers: {
        Authorization: `Bearer ${await jwt.signAccessToken(1, 60)}`,
      },
    });
    await expect(guard({ request: bearerOnly })).rejects.toBeInstanceOf(
      AuthenticationError,
    );
  });

  it("rejects invalid, missing-user, inactive-user, and password-change tokens", async () => {
    const fixture = createAuthFixture();
    const guard = requireAuth(fixture.jwt, fixture.users);

    await expect(
      guard({ request: requestFor("invalid") }),
    ).rejects.toBeInstanceOf(InvalidAuthTokenError);
    const absentUserToken = await fixture.jwt.signAccessToken(99, 60);
    await expect(
      guard({ request: requestFor(absentUserToken) }),
    ).rejects.toBeInstanceOf(InvalidAuthTokenError);

    fixture.userRecords.set(1, makeUser({ isActive: false }));
    await expect(
      guard({ request: requestFor(await fixture.jwt.signAccessToken(1, 60)) }),
    ).rejects.toBeInstanceOf(InvalidAuthTokenError);

    fixture.userRecords.set(1, makeUser({ mustChangePassword: true }));
    const initialPasswordToken = await fixture.jwt.signAccessToken(1, 60);
    await expect(
      guard({ request: requestFor(initialPasswordToken) }),
    ).rejects.toBeInstanceOf(PasswordChangeRequiredError);
    await expect(
      requireAuth(fixture.jwt, fixture.users, {
        allowPasswordChangeRequired: true,
      })({ request: requestFor(initialPasswordToken) }),
    ).resolves.toBeUndefined();
  });

  it("requires the Admin role and exposes the verified user id once per request", async () => {
    const fixture = createAuthFixture();
    const request = requestFor(await fixture.jwt.signAccessToken(1, 60));
    expect(() => readAuthUserId(request)).toThrow(AuthenticationError);

    await expect(
      requireAdmin(fixture.jwt, fixture.users)({ request }),
    ).resolves.toBeUndefined();
    expect(readAuthUserId(request)).toBe(1);
    expect(fixture.users.findById).toHaveBeenCalledTimes(1);

    fixture.userRecords.set(1, makeUser({ role: "Subadmin" }));
    await expect(
      requireAdmin(
        fixture.jwt,
        fixture.users,
      )({
        request: requestFor(await fixture.jwt.signAccessToken(1, 60)),
      }),
    ).rejects.toBeInstanceOf(ForbiddenRoleError);
  });
});
