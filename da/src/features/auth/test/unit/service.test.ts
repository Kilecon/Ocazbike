import { describe, expect, it, spyOn } from "bun:test";
import {
  DuplicateUserError,
  ForbiddenRoleError,
  InvalidAuthTokenError,
  InvalidCredentialsError,
  InvalidCurrentPasswordError,
  InvalidEmailError,
  InvalidPasswordError,
  InvalidRoleError,
  InvalidUserDataError,
  UserAlreadyActivatedError,
  UserAlreadyDeactivatedError,
  UserNotFoundError,
} from "../../errors";
import { LoginRateLimiter } from "../../loginRateLimiter";
import { createAuthFixture, makeUser, requireTestValue } from "./helpers";

describe("AuthService.login", () => {
  it("normalizes the email, records login, and creates a limited refresh session", async () => {
    const fixture = createAuthFixture();
    const tokens = await fixture.service.login(
      "  ADMIN@EXAMPLE.COM ",
      "valid-password",
      { ip: "192.0.2.1", userAgent: "unit-test" },
    );

    expect(tokens.user).toMatchObject({
      id: 1,
      email: "admin@example.com",
      role: "Admin",
      isActive: true,
    });
    expect(tokens.expiresIn).toBe(fixture.config.accessTokenTtlSeconds);
    expect(fixture.users.findByEmail).toHaveBeenCalledWith("admin@example.com");
    expect(fixture.users.recordLogin).toHaveBeenCalledWith(
      1,
      expect.any(Number),
    );
    expect(fixture.sessions.create).toHaveBeenCalledTimes(1);
    expect([...fixture.sessionRecords.values()][0]).toMatchObject({
      userId: 1,
      userAgent: "unit-test",
      revokedAt: null,
    });
    expect(fixture.sessions.limitActiveSessions).toHaveBeenCalledWith(
      1,
      fixture.config.maxSessionsPerUser,
    );
    expect(fixture.jwt.verifyAccessToken(tokens.accessToken).sub).toBe("1");
  });

  it("returns the same credential error for unknown, inactive, or wrong-password users", async () => {
    const cases = [
      createAuthFixture([]),
      createAuthFixture([makeUser({ isActive: false })]),
      createAuthFixture(),
    ];
    for (const fixture of cases) {
      await expect(
        fixture.service.login(
          fixture.userRecords.size === 0
            ? "missing@example.com"
            : "admin@example.com",
          fixture.userRecords.size > 0 &&
            [...fixture.userRecords.values()][0].isActive
            ? "wrong-password"
            : "valid-password",
        ),
      ).rejects.toBeInstanceOf(InvalidCredentialsError);
      expect(fixture.users.recordLogin).not.toHaveBeenCalled();
    }
  });

  it("enforces the login failure limiter", async () => {
    let now = 100;
    const limiter = new LoginRateLimiter({
      maxFailures: 1,
      now: () => now,
    });
    const fixture = createAuthFixture([makeUser()], { limiter });
    await expect(
      fixture.service.login("admin@example.com", "bad"),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
    await expect(
      fixture.service.login("admin@example.com", "valid-password"),
    ).rejects.toThrow("Too many failed login attempts");
    now += 15 * 60 * 1000;
    await expect(
      fixture.service.login("admin@example.com", "valid-password"),
    ).resolves.toBeDefined();
  });
});

describe("AuthService.refresh and logout", () => {
  it("rotates a valid refresh token and revokes the previous session", async () => {
    const fixture = createAuthFixture();
    const login = await fixture.service.login(
      "admin@example.com",
      "valid-password",
    );
    const oldClaims = fixture.jwt.verifyRefreshToken(login.refreshToken);
    const refreshed = await fixture.service.refresh(login.refreshToken, {
      userAgent: "new-agent",
    });

    expect(refreshed.refreshToken).not.toBe(login.refreshToken);
    expect(fixture.sessionRecords.get(oldClaims.jti)?.revokedAt).toBeInstanceOf(
      Date,
    );
    expect([...fixture.sessionRecords.values()]).toHaveLength(2);
    expect([...fixture.sessionRecords.values()][1].userAgent).toBe("new-agent");
  });

  it("rejects missing sessions, expired sessions, hash mismatches, and inactive users", async () => {
    const missing = createAuthFixture();
    const missingToken = missing.jwt.signRefreshToken(1, 60);
    await expect(missing.service.refresh(missingToken)).rejects.toBeInstanceOf(
      InvalidAuthTokenError,
    );

    const expired = createAuthFixture();
    const expiredLogin = await expired.service.login(
      "admin@example.com",
      "valid-password",
    );
    const expiredId = expired.jwt.verifyRefreshToken(
      expiredLogin.refreshToken,
    ).jti;
    requireTestValue(expired.sessionRecords.get(expiredId)).expiresAt =
      new Date(0);
    await expect(
      expired.service.refresh(expiredLogin.refreshToken),
    ).rejects.toBeInstanceOf(InvalidAuthTokenError);

    const hashMismatch = createAuthFixture();
    const mismatchLogin = await hashMismatch.service.login(
      "admin@example.com",
      "valid-password",
    );
    const mismatchId = hashMismatch.jwt.verifyRefreshToken(
      mismatchLogin.refreshToken,
    ).jti;
    requireTestValue(hashMismatch.sessionRecords.get(mismatchId)).tokenHash =
      "wrong";
    await expect(
      hashMismatch.service.refresh(mismatchLogin.refreshToken),
    ).rejects.toBeInstanceOf(InvalidAuthTokenError);

    const inactive = createAuthFixture();
    const inactiveLogin = await inactive.service.login(
      "admin@example.com",
      "valid-password",
    );
    requireTestValue(inactive.userRecords.get(1)).isActive = false;
    await expect(
      inactive.service.refresh(inactiveLogin.refreshToken),
    ).rejects.toBeInstanceOf(InvalidAuthTokenError);
  });

  it("rejects replayed refresh tokens and revokes all sessions outside the grace window", async () => {
    const fixture = createAuthFixture();
    const login = await fixture.service.login(
      "admin@example.com",
      "valid-password",
    );
    const id = fixture.jwt.verifyRefreshToken(login.refreshToken).jti;
    requireTestValue(fixture.sessionRecords.get(id)).revokedAt = new Date(
      Date.now() - 11_000,
    );

    await expect(
      fixture.service.refresh(login.refreshToken),
    ).rejects.toBeInstanceOf(InvalidAuthTokenError);
    expect(fixture.sessions.revokeAllForUser).toHaveBeenCalledWith(1);
  });

  it("does not revoke all sessions when a rotated token is replayed inside the grace window", async () => {
    const fixture = createAuthFixture();
    const login = await fixture.service.login(
      "admin@example.com",
      "valid-password",
    );
    const id = fixture.jwt.verifyRefreshToken(login.refreshToken).jti;
    requireTestValue(fixture.sessionRecords.get(id)).revokedAt = new Date();

    await expect(
      fixture.service.refresh(login.refreshToken),
    ).rejects.toBeInstanceOf(InvalidAuthTokenError);
    expect(fixture.sessions.revokeAllForUser).not.toHaveBeenCalled();
  });

  it("deletes the refresh session and records logout", async () => {
    const fixture = createAuthFixture();
    const login = await fixture.service.login(
      "admin@example.com",
      "valid-password",
    );
    const claims = fixture.jwt.verifyRefreshToken(login.refreshToken);

    await fixture.service.logout(login.refreshToken);
    expect(fixture.sessions.delete).toHaveBeenCalledWith(claims.jti);
    expect(fixture.sessionRecords.has(claims.jti)).toBe(false);
    expect(fixture.users.recordLogout).toHaveBeenCalledWith(
      1,
      expect.any(Number),
    );
  });
});

describe("AuthService user operations", () => {
  it("returns the current user and rejects missing or inactive users", async () => {
    const fixture = createAuthFixture();
    expect(await fixture.service.me(1)).toEqual({
      email: "admin@example.com",
      firstname: "Admin",
      lastname: "User",
      role: "Admin",
      mustChangePassword: false,
      lastLoginAtEpochMs: null,
    });
    await expect(fixture.service.me(99)).rejects.toBeInstanceOf(
      InvalidAuthTokenError,
    );
    requireTestValue(fixture.userRecords.get(1)).isActive = false;
    await expect(fixture.service.me(1)).rejects.toBeInstanceOf(
      InvalidAuthTokenError,
    );
  });

  it("creates normalized users with defaults and never returns password hashes", async () => {
    const fixture = createAuthFixture([]);
    const user = await fixture.service.createUser({
      email: "  New.User@Example.COM ",
      firstname: " New ",
      lastname: " Person ",
      password: "long-enough-password",
    });
    expect(user).toEqual({
      id: 1,
      email: "new.user@example.com",
      firstname: "New",
      lastname: "Person",
      role: "Subadmin",
      isActive: true,
      mustChangePassword: true,
    });
    expect(fixture.passwords.hash).toHaveBeenCalledWith("long-enough-password");
    expect(user).not.toHaveProperty("passwordHash");
  });

  it("validates user email, names, password, role, and uniqueness", async () => {
    const invalidInputs = [
      [
        {
          email: "bad",
          firstname: "A",
          lastname: "B",
          password: "long-enough-password",
        },
        InvalidEmailError,
      ],
      [
        {
          email: "a@example.com",
          firstname: " ",
          lastname: "B",
          password: "long-enough-password",
        },
        InvalidUserDataError,
      ],
      [
        {
          email: "a@example.com",
          firstname: "A",
          lastname: " ",
          password: "long-enough-password",
        },
        InvalidUserDataError,
      ],
      [
        {
          email: "a@example.com",
          firstname: "A",
          lastname: "B",
          password: "short",
        },
        InvalidPasswordError,
      ],
      [
        {
          email: "a@example.com",
          firstname: "A",
          lastname: "B",
          password: "long-enough-password",
          role: "Owner",
        },
        InvalidRoleError,
      ],
    ] as const;
    for (const [input, error] of invalidInputs) {
      const fixture = createAuthFixture([]);
      await expect(fixture.service.createUser(input)).rejects.toBeInstanceOf(
        error,
      );
      expect(fixture.users.create).not.toHaveBeenCalled();
    }

    const duplicate = createAuthFixture();
    await expect(
      duplicate.service.createUser({
        email: " ADMIN@example.com ",
        firstname: "New",
        lastname: "User",
        password: "long-enough-password",
      }),
    ).rejects.toBeInstanceOf(DuplicateUserError);
  });

  it("lists users with pagination and no password hashes", async () => {
    const fixture = createAuthFixture([
      makeUser({ id: 1 }),
      makeUser({ id: 2, email: "second@example.com", role: "Subadmin" }),
      makeUser({ id: 3, email: "inactive@example.com", isActive: false }),
    ]);
    const page = await fixture.service.listUsers(false, 2, 1);
    expect(fixture.users.list).toHaveBeenCalledWith(false, 1, 1);
    expect(page).toHaveLength(1);
    expect(page[0]).toMatchObject({ id: 2, email: "second@example.com" });
    expect(page[0]).not.toHaveProperty("passwordHash");
  });

  it("activates/deactivates other users and revokes sessions on deactivation", async () => {
    const fixture = createAuthFixture([
      makeUser(),
      makeUser({ id: 2, email: "other@example.com", isActive: true }),
      makeUser({ id: 3, email: "inactive@example.com", isActive: false }),
    ]);
    await fixture.service.deactivateUser(2, 1);
    expect(fixture.userRecords.get(2)?.isActive).toBe(false);
    expect(fixture.users.setActive).toHaveBeenCalledWith(
      2,
      false,
      expect.any(Number),
    );
    expect(fixture.sessions.revokeAllForUser).toHaveBeenCalledWith(2);

    await fixture.service.activateUser(3, 1);
    expect(fixture.userRecords.get(3)?.isActive).toBe(true);
    expect(fixture.users.setActive).toHaveBeenCalledWith(
      3,
      true,
      expect.any(Number),
    );
  });

  it("rejects self-status changes, missing users, and unchanged states", async () => {
    const fixture = createAuthFixture([
      makeUser(),
      makeUser({ id: 2, email: "inactive@example.com", isActive: false }),
    ]);
    await expect(fixture.service.deactivateUser(1, 1)).rejects.toBeInstanceOf(
      ForbiddenRoleError,
    );
    await expect(fixture.service.activateUser(1, 1)).rejects.toBeInstanceOf(
      ForbiddenRoleError,
    );
    await expect(fixture.service.deactivateUser(99, 1)).rejects.toBeInstanceOf(
      UserNotFoundError,
    );
    await expect(fixture.service.activateUser(99, 1)).rejects.toBeInstanceOf(
      UserNotFoundError,
    );
    await expect(fixture.service.deactivateUser(2, 1)).rejects.toBeInstanceOf(
      UserAlreadyDeactivatedError,
    );
    await expect(fixture.service.activateUser(1, 2)).rejects.toBeInstanceOf(
      UserAlreadyActivatedError,
    );
  });

  it("changes password only when the current credentials and new-password policy pass", async () => {
    const fixture = createAuthFixture();
    await expect(
      fixture.service.changePassword(
        99,
        "current-password",
        "long-new-password",
      ),
    ).rejects.toBeInstanceOf(InvalidAuthTokenError);
    requireTestValue(fixture.userRecords.get(1)).isActive = false;
    await expect(
      fixture.service.changePassword(
        1,
        "current-password",
        "long-new-password",
      ),
    ).rejects.toBeInstanceOf(InvalidAuthTokenError);
    requireTestValue(fixture.userRecords.get(1)).isActive = true;
    await expect(
      fixture.service.changePassword(1, "wrong", "long-new-password"),
    ).rejects.toBeInstanceOf(InvalidCurrentPasswordError);
    await expect(
      fixture.service.changePassword(1, "valid-password", "short"),
    ).rejects.toBeInstanceOf(InvalidPasswordError);

    const nowSpy = spyOn(Date, "now").mockReturnValue(9876);
    await fixture.service.changePassword(
      1,
      "valid-password",
      "long-new-password",
    );
    expect(fixture.passwords.hash).toHaveBeenCalledWith("long-new-password");
    expect(fixture.users.updatePassword).toHaveBeenCalledWith(
      1,
      "hash:long-new-password",
      9876,
    );
    expect(fixture.userRecords.get(1)?.mustChangePassword).toBe(false);
    nowSpy.mockRestore();
  });
});
