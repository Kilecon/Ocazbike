import { afterEach, describe, expect, it } from "bun:test";
import {
  createUser,
  getUserCounts,
  listUsers,
  setUserActive,
} from "@/features/users/api";
import { mockFetch } from "@/shared/test/mockFetch";
import { changeInitialPassword, getCurrentUser, login, logout } from "./api";
import type { CurrentUser } from "./types";

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("user status API", () => {
  it("requests the selected status and page with cancellable requests", async () => {
    const controller = new AbortController();
    globalThis.fetch = Object.assign(
      async (input: RequestInfo | URL, options?: RequestInit) => {
        const url = new URL(String(input));
        expect(Object.fromEntries(url.searchParams)).toEqual({
          activeOnly: "false",
          page: "2",
          limit: "10",
          status: "inactive",
        });
        expect(options?.signal).toBe(controller.signal);
        return Response.json([]);
      },
      { preconnect: originalFetch.preconnect },
    );
    expect(
      await listUsers(false, 2, 10, "inactive", controller.signal),
    ).toEqual([]);
  });

  it("uses the active-user and pagination defaults and can request all users", async () => {
    const calls = mockFetch([Response.json([]), Response.json([])]);

    await listUsers();
    await listUsers(true, 1, 10, "all");

    const defaultParams = new URL(calls[0]?.url ?? "").searchParams;
    expect(Object.fromEntries(defaultParams)).toEqual({
      activeOnly: "true",
      page: "1",
      limit: "10",
    });
    const allParams = new URL(calls[1]?.url ?? "").searchParams;
    expect(Object.fromEntries(allParams)).toEqual({
      activeOnly: "true",
      page: "1",
      limit: "10",
      status: "all",
    });
  });

  it("loads the global counts", async () => {
    const counts = { all: 15, active: 12, inactive: 3 };
    globalThis.fetch = Object.assign(
      async (input: RequestInfo | URL) => {
        expect(new URL(String(input)).pathname).toBe("/users/counts");
        return Response.json(counts);
      },
      { preconnect: originalFetch.preconnect },
    );
    expect(await getUserCounts()).toEqual(counts);
  });
});

describe("authentication API", () => {
  it("loads the current session user", async () => {
    const user: CurrentUser = {
      email: "ada@example.test",
      firstname: "Ada",
      lastname: "Lovelace",
      role: "Admin",
      mustChangePassword: false,
      lastLoginAtEpochMs: 1_800_000_000_000,
    };
    const calls = mockFetch([Response.json(user)]);

    await expect(getCurrentUser()).resolves.toEqual(user);

    expect(new URL(calls[0]?.url ?? "").pathname).toBe("/auth/me");
    expect(calls[0]?.init.method).toBeUndefined();
  });

  it("sends login and password-change payloads and logs out", async () => {
    const calls = mockFetch([
      Response.json({ expiresIn: 900, user: {} }),
      new Response(null, { status: 204 }),
      new Response(null, { status: 204 }),
    ]);

    await login("ada@example.test", "current-password");
    await changeInitialPassword("current-password", "a-new-password");
    await logout();

    expect(
      calls.map(({ url, init }) => [
        new URL(url).pathname,
        init.method,
        init.body,
      ]),
    ).toEqual([
      [
        "/auth/login",
        "POST",
        JSON.stringify({
          email: "ada@example.test",
          password: "current-password",
        }),
      ],
      [
        "/auth/change-password",
        "POST",
        JSON.stringify({
          currentPassword: "current-password",
          password: "a-new-password",
        }),
      ],
      ["/auth/logout", "POST", undefined],
    ]);
  });

  it("creates users and targets the requested activation state", async () => {
    const createdUser = {
      id: 7,
      email: "new@example.test",
      firstname: "Ada",
      lastname: "Lovelace",
      role: "Subadmin" as const,
      isActive: true,
      mustChangePassword: true,
    };
    const calls = mockFetch([
      Response.json(createdUser),
      new Response(null, { status: 204 }),
      new Response(null, { status: 204 }),
    ]);
    const input = {
      email: createdUser.email,
      firstname: createdUser.firstname,
      lastname: createdUser.lastname,
      password: "temporary-password",
      role: "Subadmin" as const,
    };

    await expect(createUser(input)).resolves.toEqual(createdUser);
    await setUserActive(createdUser.id, false);
    await setUserActive(createdUser.id, true);

    expect(
      calls.map(({ url, init }) => [
        new URL(url).pathname,
        init.method,
        init.body,
      ]),
    ).toEqual([
      ["/users", "POST", JSON.stringify(input)],
      ["/users/7/deactivate", "PATCH", undefined],
      ["/users/7/activate", "PATCH", undefined],
    ]);
  });
});
