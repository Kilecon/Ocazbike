import { describe, expect, it } from "bun:test";
import { createHarness, expectError, expectManagedUserShape } from "./helpers";

describe("GET /users", () => {
  it("lists active users by default, paginates, and exposes timestamp fields", async () => {
    const { request, adminAuthorization } = createHarness();
    const authorization = await adminAuthorization();
    const active = await request("/users", {
      headers: { Authorization: authorization },
    });
    const all = await request("/users?activeOnly=false&limit=50", {
      headers: { Authorization: authorization },
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
      headers: { Authorization: authorization },
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
        headers: { Authorization: authorization },
      });
      expect(response.status).toBe(400);
    }
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
        headers: { Authorization: "Bearer invalid" },
      }),
      401,
      "INVALID_AUTH_TOKEN",
      "Invalid token",
    );
    const loggedIn = await login("user2@example.com");
    const { accessToken } = await loggedIn.json();
    await expectError(
      await request("/users", {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
      403,
      "FORBIDDEN",
      "Missings rights",
    );
  });
});
