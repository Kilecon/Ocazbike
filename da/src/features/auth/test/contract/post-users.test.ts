import { describe, expect, it } from "bun:test";
import { createHarness, expectError, json } from "./helpers";

describe("POST /users", () => {
  it("creates users and rejects invalid or duplicate user data", async () => {
    const { request, login, adminAuthorization } = createHarness();
    const authorization = await adminAuthorization();
    const validUser = {
      email: "new@example.com",
      firstname: "New",
      lastname: "User",
      role: "Subadmin",
      password: "StrongPasswordSecure",
    };
    await expectError(
      await request("/users", {
        method: "POST",
        ...json(validUser),
      }),
      401,
      "UNAUTHORIZED",
      "Not authenticated",
    );
    await expectError(
      await request("/users", {
        method: "POST",
        headers: { Authorization: "Bearer invalid" },
        ...json(validUser),
      }),
      401,
      "INVALID_AUTH_TOKEN",
      "Invalid token",
    );
    const subadminLogin = await login("user2@example.com");
    const { accessToken: subadminToken } = await subadminLogin.json();
    await expectError(
      await request("/users", {
        method: "POST",
        headers: { Authorization: `Bearer ${subadminToken}` },
        ...json(validUser),
      }),
      403,
      "FORBIDDEN",
      "Missings rights",
    );

    const created = await request("/users", {
      method: "POST",
      headers: { Authorization: authorization },
      ...json(validUser),
    });
    expect(created.status).toBe(201);
    expect(await created.json()).toEqual({
      id: 4,
      email: "new@example.com",
      firstname: "New",
      lastname: "User",
      role: "Subadmin",
      isActive: true,
      mustChangePassword: true,
    });

    const duplicate = await request("/users", {
      method: "POST",
      headers: { Authorization: authorization },
      ...json(validUser),
    });
    await expectError(
      duplicate,
      409,
      "EMAIL_ALREADY_EXISTS",
      "Email already exists",
    );

    const invalidEmail = await request("/users", {
      method: "POST",
      headers: { Authorization: authorization },
      ...json({ ...validUser, email: "not-an-email" }),
    });
    await expectError(
      invalidEmail,
      400,
      "INVALID_EMAIL",
      "Invalid email address",
    );

    const invalidNames = await request("/users", {
      method: "POST",
      headers: { Authorization: authorization },
      ...json({ ...validUser, email: "names@example.com", firstname: " " }),
    });
    await expectError(
      invalidNames,
      400,
      "INVALID_USER_DATA",
      "Invalid first name or last name",
    );

    const invalidPassword = await request("/users", {
      method: "POST",
      headers: { Authorization: authorization },
      ...json({
        ...validUser,
        email: "password@example.com",
        password: "short",
      }),
    });
    await expectError(
      invalidPassword,
      400,
      "INVALID_PASSWORD",
      "Invalid password",
    );

    const invalidRole = await request("/users", {
      method: "POST",
      headers: { Authorization: authorization },
      ...json({ ...validUser, email: "role@example.com", role: "Owner" }),
    });
    await expectError(
      invalidRole,
      400,
      "INVALID_ROLE",
      "Invalid or unauthorized role",
    );
  });

  it("returns BAD_REQUEST for malformed create-user bodies", async () => {
    const { request, adminAuthorization } = createHarness();
    const response = await request("/users", {
      method: "POST",
      headers: { Authorization: await adminAuthorization() },
      ...json({ email: "incomplete@example.com" }),
    });
    await expectError(response, 400, "BAD_REQUEST", "Invalid request data");
  });
});
