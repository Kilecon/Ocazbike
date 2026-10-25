import { describe, expect, it } from "bun:test";
import { createHarness, expectError } from "./helpers";

describe("PATCH /users/:id/{activate,deactivate}", () => {
  it("activates and deactivates accounts with 204 responses", async () => {
    const { request, adminAuthorization, users } = createHarness();
    const authorization = await adminAuthorization();
    const deactivate = await request("/users/2/deactivate", {
      method: "PATCH",
      headers: { Authorization: authorization },
    });
    expect(deactivate.status).toBe(204);
    expect(await deactivate.text()).toBe("");
    expect(users.values[1].isActive).toBe(false);

    const activate = await request("/users/3/activate", {
      method: "PATCH",
      headers: { Authorization: authorization },
    });
    expect(activate.status).toBe(204);
    expect(await activate.text()).toBe("");
    expect(users.values[2].isActive).toBe(true);
  });

  it("requires an authenticated Admin to change account status", async () => {
    const { request, login } = createHarness();
    await expectError(
      await request("/users/2/deactivate", { method: "PATCH" }),
      401,
      "UNAUTHORIZED",
      "Not authenticated",
    );
    await expectError(
      await request("/users/2/activate", {
        method: "PATCH",
        headers: { Authorization: "Bearer invalid" },
      }),
      401,
      "INVALID_AUTH_TOKEN",
      "Invalid token",
    );
    const subadminLogin = await login("user2@example.com");
    const { accessToken } = await subadminLogin.json();
    const authorization = `Bearer ${accessToken}`;
    await expectError(
      await request("/users/3/deactivate", {
        method: "PATCH",
        headers: { Authorization: authorization },
      }),
      403,
      "FORBIDDEN",
      "Missings rights",
    );
    await expectError(
      await request("/users/3/activate", {
        method: "PATCH",
        headers: { Authorization: authorization },
      }),
      403,
      "FORBIDDEN",
      "Missings rights",
    );
  });

  it("returns the documented missing-user and duplicate-state errors", async () => {
    const { request, adminAuthorization } = createHarness();
    const authorization = await adminAuthorization();
    const activateMissing = await request("/users/99/activate", {
      method: "PATCH",
      headers: { Authorization: authorization },
    });
    await expectError(activateMissing, 404, "USER_NOT_FOUND", "User not found");

    await expectError(
      await request("/users/2/activate", {
        method: "PATCH",
        headers: { Authorization: authorization },
      }),
      409,
      "USER_ALREADY_ACTIVATED",
      "User already activated",
    );
    await expectError(
      await request("/users/3/deactivate", {
        method: "PATCH",
        headers: { Authorization: authorization },
      }),
      409,
      "USER_ALREADY_DEACTIVATED",
      "User already deactivated",
    );
  });

  it("prevents Admins from changing their own account status", async () => {
    const { request, adminAuthorization, users } = createHarness();
    const authorization = await adminAuthorization();
    await expectError(
      await request("/users/1/deactivate", {
        method: "PATCH",
        headers: { Authorization: authorization },
      }),
      403,
      "FORBIDDEN",
      "Missings rights",
    );
    expect(users.values[0].isActive).toBe(true);
  });

  it("allows Admins to activate and deactivate other Admin accounts", async () => {
    const { request, adminAuthorization, users } = createHarness();
    const authorization = await adminAuthorization();
    users.values[1].role = "Admin";

    const deactivate = await request("/users/2/deactivate", {
      method: "PATCH",
      headers: { Authorization: authorization },
    });
    expect(deactivate.status).toBe(204);
    expect(users.values[1].isActive).toBe(false);

    const activate = await request("/users/2/activate", {
      method: "PATCH",
      headers: { Authorization: authorization },
    });
    expect(activate.status).toBe(204);
    expect(users.values[1].isActive).toBe(true);
  });
});
