import { describe, expect, it } from "bun:test";
import { accessTokenFrom } from "../../../../tests-helpers/authCookies";
import { createHarness, expectError, expectManagedUserShape } from "./helpers";

describe("GET /users", () => {
  it("lists active users by default, paginates, and exposes timestamp fields", async () => {
    const { request, adminAuthorization } = createHarness();
    const authorization = await adminAuthorization();
    const active = await request("/users", {
      headers: { Cookie: authorization },
    });
    const all = await request("/users?activeOnly=false&limit=50", {
      headers: { Cookie: authorization },
    });
    const activeUsers = await active.json();
    const allUsers = await all.json();

    expect(active.status).toBe(200);
    expect(activeUsers.map(({ id }: { id: number }) => id)).toEqual([1, 2]);
    expect(all.status).toBe(200);
    expect(allUsers.map(({ id }: { id: number }) => id)).toEqual([1, 2, 3]);
    for (const user of allUsers) {
      expectManagedUserShape(user);
    }
    expect(allUsers[2].lastLoginAtEpochMs).toBeNull();
    expect(activeUsers[0]).toEqual({
      id: 1,
      email: "admin@example.com",
      firstname: "Admin",
      lastname: "Contract",
      role: "Admin",
      isActive: true,
      mustChangePassword: false,
      lastLoginAtEpochMs: expect.any(Number),
      createdAtEpochMs: expect.any(Number),
      updatedAtEpochMs: expect.any(Number),
    });

    const secondPage = await request("/users?activeOnly=false&page=2&limit=2", {
      headers: { Cookie: authorization },
    });
    expect(
      (await secondPage.json()).map(({ id }: { id: number }) => id),
    ).toEqual([3]);
  });

  it("rejects invalid pagination values", async () => {
    const { request, adminAuthorization } = createHarness();
    const authorization = await adminAuthorization();
    for (const query of [
      "page=0",
      "page=1.5",
      "limit=0",
      "limit=2.5",
      "limit=51",
    ]) {
      const response = await request(`/users?${query}`, {
        headers: { Cookie: authorization },
      });
      expect(response.status).toBe(400);
    }
  });

  it("filters and counts users by status independently of pagination", async () => {
    const { request, adminAuthorization } = createHarness();
    const authorization = await adminAuthorization();
    const headers = { Cookie: authorization };

    for (const [status, ids] of [
      ["all", [1, 2, 3]],
      ["active", [1, 2]],
      ["inactive", [3]],
    ] as const) {
      const response = await request(`/users?status=${status}&limit=50`, {
        headers,
      });
      expect(response.status).toBe(200);
      expect(
        (await response.json()).map(({ id }: { id: number }) => id),
      ).toEqual(ids);
    }

    const page = await request("/users?status=inactive&page=2&limit=1", {
      headers,
    });
    expect(await page.json()).toEqual([]);
    const counts = await request("/users/counts", { headers });
    expect(counts.status).toBe(200);
    expect(await counts.json()).toEqual({ all: 3, active: 2, inactive: 1 });
    const invalid = await request("/users?status=unknown", { headers });
    expect(invalid.status).toBe(400);
    expect((await request("/users/counts")).status).toBe(401);
    const subadmin = await createHarness().login("user2@example.com");
    const token = accessTokenFrom(subadmin);
    expect(
      (
        await request("/users/counts", {
          headers: { Cookie: `access_token=${token}` },
        })
      ).status,
    ).toBe(403);
  });

  it("requires an authenticated Admin to list users", async () => {
    const { request, login } = createHarness();
    await expectError(
      await request("/users"),
      401,
      "UNAUTHORIZED",
      "Not authenticated",
    );
    await expectError(
      await request("/users", {
        headers: { Cookie: "access_token=invalid" },
      }),
      401,
      "INVALID_AUTH_TOKEN",
      "Invalid token",
    );
    const loggedIn = await login("user2@example.com");
    const accessToken = accessTokenFrom(loggedIn);
    await expectError(
      await request("/users", {
        headers: { Cookie: `access_token=${accessToken}` },
      }),
      403,
      "FORBIDDEN",
      "Missings rights",
    );
  });
});
