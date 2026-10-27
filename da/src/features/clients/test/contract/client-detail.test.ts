import { describe, expect, it } from "bun:test";
import { createHarness } from "./helpers";

const validClient = {
  firstname: "Ada",
  lastname: "Lovelace",
  email: "ada@example.com",
};

describe("client detail contract", () => {
  it("exposes the detail fields but omits the modifier id and billing documents", async () => {
    const { clients, request, authorization } = createHarness();
    await clients.create(
      {
        ...validClient,
        addressComplement: "Bâtiment A",
        identityCardNumber: "ID-123",
        privatenote: "Private",
      },
      1,
    );

    const response = await request("/clients/1", {
      headers: { Authorization: authorization(2) },
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      id: 1,
      firstname: "Ada",
      addressComplement: "Bâtiment A",
      identityCardNumber: "ID-123",
      privatenote: "Private",
      isProfessional: false,
      lastModificationMs: expect.any(Number),
      createdAtMs: expect.any(Number),
    });
    expect(body).not.toHaveProperty("modifiedByUserId");
    expect(body).not.toHaveProperty("operations");
  });

  it("returns 400 for malformed ids and 404 for absent clients", async () => {
    const { request, authorization } = createHarness();

    const malformed = await request("/clients/not-an-id", {
      headers: { Authorization: authorization() },
    });
    const missing = await request("/clients/99", {
      headers: { Authorization: authorization() },
    });
    expect(malformed.status).toBe(400);
    expect(missing.status).toBe(404);
  });
});
