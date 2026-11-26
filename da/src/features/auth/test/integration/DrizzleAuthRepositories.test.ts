import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "bun:test";
import { ok } from "node:assert/strict";
import { DataProtector } from "../../../../shared/crypto/DataProtector";
import { createTestDatabase } from "../../../../tests-helpers/testDatabase";
import { ensureBootstrapAdmin } from "../../bootstrapAdmin";
import {
  DrizzleRefreshSessionRepository,
  DrizzleUserRepository,
} from "../../infrastructure/DrizzleAuthRepositories";
import { BcryptPasswordHasher } from "../../password";

const protector = new DataProtector(Buffer.alloc(32, 12));
const revokedRetentionMs = 7 * 24 * 60 * 60 * 1000;
let testDatabase: ReturnType<typeof createTestDatabase>;
let users: DrizzleUserRepository;
let sessions: DrizzleRefreshSessionRepository;

beforeAll(() => {
  testDatabase = createTestDatabase("auth-drizzle-repositories");
  users = new DrizzleUserRepository(testDatabase.database, protector);
  sessions = new DrizzleRefreshSessionRepository(testDatabase.database);
});

beforeEach(() => {
  testDatabase.sqlite.run(
    "DELETE FROM refresh_sessions; DELETE FROM users; DELETE FROM sqlite_sequence WHERE name = 'users';",
  );
});

afterAll(() => testDatabase?.cleanup());

async function createUser(
  email = "user@example.com",
  mustChangePassword = false,
) {
  const now = Date.now();
  return users.create({
    email,
    firstname: "First",
    lastname: "Last",
    passwordHash: "bcrypt-hash",
    role: "Subadmin",
    isActive: true,
    mustChangePassword,
    lastLoginAtEpochMs: null,
    createdAtEpochMs: now,
    updatedAtEpochMs: now,
  });
}

function createSession(
  id: string,
  userId: number,
  overrides: {
    expiresAt?: Date;
    revokedAt?: Date | null;
  } = {},
) {
  return sessions.create({
    id,
    userId,
    tokenHash: `hash-${id}`,
    expiresAt: overrides.expiresAt ?? new Date(Date.now() + 60_000),
    revokedAt: overrides.revokedAt ?? null,
    userAgent: null,
  });
}

describe("Drizzle user and refresh-session repositories", () => {
  it("counts and paginates users by active status", async () => {
    const first = await createUser("first@example.com");
    const second = await createUser("second@example.com");
    const third = await createUser("third@example.com");
    await users.setActive(second.id, false);
    await users.setActive(third.id, false);

    expect(await users.countByStatus()).toEqual({
      all: 3,
      active: 1,
      inactive: 2,
    });
    expect(
      (await users.list(true, 1, 1, "inactive")).map((user) => user.id),
    ).toEqual([third.id]);
    expect(
      (await users.list(true, 10, 0, "all")).map((user) => user.id),
    ).toEqual([first.id, second.id, third.id]);
    expect(
      (await users.list(false, 10, 0, "active")).map((user) => user.id),
    ).toEqual([first.id]);
    await users.setActive(second.id, true);
    expect(await users.countByStatus()).toEqual({
      all: 3,
      active: 2,
      inactive: 1,
    });
  });

  it("bootstraps one initial administrator on the consolidated schema", async () => {
    const passwords = new BcryptPasswordHasher(4);
    await ensureBootstrapAdmin(users, passwords, {
      BOOTSTRAP_ADMIN_PASSWORD: "test-bootstrap-password",
    });
    const admin = await users.findByEmail("admin@example.com");
    expect(admin).toMatchObject({
      role: "Admin",
      isActive: true,
      mustChangePassword: true,
    });
    await ensureBootstrapAdmin(users, passwords, {});
    ok(admin);
    expect(
      await passwords.compare("test-bootstrap-password", admin.passwordHash),
    ).toBe(true);
    expect((await users.findByEmail("admin@example.com"))?.id).toBe(admin?.id);
    expect(
      testDatabase.sqlite.query("SELECT count(*) AS total FROM users").get(),
    ).toEqual({
      total: 1,
    });
  });

  it("stores encrypted user data and supports case-insensitive email lookup", async () => {
    const now = Date.now();
    const user = await users.create({
      email: "User@Example.com",
      firstname: "First",
      lastname: "Last",
      passwordHash: "bcrypt-hash",
      role: "Subadmin",
      isActive: true,
      mustChangePassword: false,
      lastLoginAtEpochMs: null,
      createdAtEpochMs: now,
      updatedAtEpochMs: now,
    });
    const stored = testDatabase.sqlite
      .query("SELECT email, firstname, lastname, encryption_salt FROM users")
      .get() as {
      email: string;
      firstname: string;
      lastname: string;
      encryption_salt: string;
    };

    expect(stored.email).not.toContain("User@Example.com");
    expect(stored.firstname).not.toContain("First");
    expect(stored.lastname).not.toContain("Last");
    expect(stored.encryption_salt).not.toBe("");
    expect(
      (
        testDatabase.sqlite.query("PRAGMA table_xinfo(users)").all() as {
          name: string;
          hidden: number;
        }[]
      )
        .filter(({ name }) =>
          ["last_login_at", "created_at", "updated_at"].includes(name),
        )
        .every(({ hidden }) => hidden === 2),
    ).toBe(true);
    expect(user.createdAtEpochMs).toBe(now);
    expect(user.updatedAtEpochMs).toBe(now);
    expect(user).not.toHaveProperty("createdAt");
    expect(user).not.toHaveProperty("updatedAt");
    expect(user).not.toHaveProperty("lastLoginAt");
    expect(protector.decrypt(stored.email, stored.encryption_salt)).toBe(
      "User@Example.com",
    );
    expect(protector.decrypt(stored.firstname, stored.encryption_salt)).toBe(
      "First",
    );
    expect(protector.decrypt(stored.lastname, stored.encryption_salt)).toBe(
      "Last",
    );
    expect(await users.findByEmail(" USER@EXAMPLE.COM ")).toEqual(user);
  });

  it("records login timestamps without returning virtual display columns", async () => {
    const user = await createUser();
    const now = Date.now();

    await users.recordLogin(user.id, now);

    const loggedInUser = await users.findById(user.id);
    expect(loggedInUser?.lastLoginAtEpochMs).toBe(now);
    expect(loggedInUser).not.toHaveProperty("lastLoginAt");
  });

  it("updates password, role and logout timestamps", async () => {
    const user = await createUser("updated@example.com", true);

    await users.updatePassword(user.id, "new-bcrypt-hash", 100);
    await users.setRole(user.id, "Admin", 200);
    await users.recordLogout(user.id, 300);

    expect(await users.findById(user.id)).toMatchObject({
      passwordHash: "new-bcrypt-hash",
      mustChangePassword: false,
      role: "Admin",
      updatedAtEpochMs: 300,
      lastLoginAtEpochMs: null,
    });
  });

  it("limits the number of active refresh sessions", async () => {
    const user = await createUser();
    for (const id of ["a", "b", "c"]) {
      await createSession(id, user.id);
      await Bun.sleep(2);
    }

    await sessions.limitActiveSessions(user.id, 2);

    expect(await sessions.findById("a")).toBeNull();
    expect((await sessions.findById("b"))?.revokedAt).toBeNull();
    const retainedSession = await sessions.findById("c");
    expect(retainedSession?.revokedAt).toBeNull();
    expect(retainedSession).not.toHaveProperty("expiresAtText");
    expect(retainedSession).not.toHaveProperty("revokedAtText");
    expect(retainedSession).not.toHaveProperty("createdAtText");
  });

  it("purges expired sessions and revoked sessions past their retention period", async () => {
    const user = await createUser();
    const now = Date.now();
    await createSession("expired", user.id, {
      expiresAt: new Date(now - 1_000),
    });
    await createSession("old-revoked", user.id, {
      revokedAt: new Date(now - revokedRetentionMs - 1),
    });
    await createSession("recent-revoked", user.id, {
      revokedAt: new Date(now - 1_000),
    });
    await createSession("expired-recent-revoked", user.id, {
      expiresAt: new Date(now - 1_000),
      revokedAt: new Date(now - 2_000),
    });

    expect(await sessions.deleteExpired(new Date(now))).toBe(2);
    expect(await sessions.findById("expired")).toBeNull();
    expect(await sessions.findById("old-revoked")).toBeNull();
    expect(await sessions.findById("recent-revoked")).not.toBeNull();
    expect(await sessions.findById("expired-recent-revoked")).not.toBeNull();
  });

  it("revokes one session or all sessions for a user and can delete a session", async () => {
    const user = await createUser("session-owner@example.com");
    const otherUser = await createUser("other-session-owner@example.com");
    await createSession("selected-session", user.id);
    await createSession("remaining-session", user.id);
    await createSession("unrelated-session", otherUser.id);
    const revokedAt = new Date("2026-11-22T12:00:00.000Z");

    await sessions.revoke("selected-session", revokedAt);
    expect((await sessions.findById("selected-session"))?.revokedAt).toEqual(
      revokedAt,
    );

    await sessions.revokeAllForUser(user.id);
    expect(
      (await sessions.findById("remaining-session"))?.revokedAt,
    ).toBeInstanceOf(Date);
    expect(
      (await sessions.findById("unrelated-session"))?.revokedAt,
    ).toBeNull();

    await sessions.delete("selected-session");
    expect(await sessions.findById("selected-session")).toBeNull();
  });

  it("filters active users by default and can include inactive users", async () => {
    const activeUser = await createUser("active@example.com");
    const inactiveUser = await createUser("inactive@example.com");
    await users.setActive(inactiveUser.id, false);

    expect((await users.list()).map(({ id }) => id)).toEqual([activeUser.id]);
    expect((await users.list(false)).map(({ id }) => id)).toEqual([
      activeUser.id,
      inactiveUser.id,
    ]);

    await users.setActive(inactiveUser.id, true);
    expect((await users.list()).map(({ id }) => id)).toContain(inactiveUser.id);
  });
});
