import { describe, expect, it } from "bun:test";
import { createHarness } from "./helpers";

describe("GET /clients contract", () => {
  it("returns a paginated public projection without private or audit fields", async () => {
    const { clients, request, authorization } = createHarness();
    await clients.create(
      {
        firstname: "Ada",
        lastname: "Lovelace",
        email: "ada@example.com",
        phonenumber: "0600000000",
        address: "1 rue de Rivoli",
        addressComplement: "Bâtiment A",
        identityCardNumber: "ID-123",
        privatenote: "Sensitive note",
      },
      1,
    );

    const response = await request("/clients?page=1&limit=1", {
      headers: { Authorization: authorization() },
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ page: 1, limit: 1, total: 1 });
    expect(body.clients).toEqual([
      {
        id: 1,
        firstname: "Ada",
        lastname: "Lovelace",
        email: "ada@example.com",
        phonenumber: "0600000000",
        address: "1 rue de Rivoli",
        addressComplement: "Bâtiment A",
        isProfessional: false,
        siret: null,
        companyName: null,
      },
    ]);
    expect(body.clients[0]).not.toHaveProperty("identityCardNumber");
    expect(body.clients[0]).not.toHaveProperty("privatenote");
    expect(body.clients[0]).not.toHaveProperty("modifiedByUserId");
    expect(body.clients[0]).not.toHaveProperty("lastModificationMs");
    expect(body.clients[0]).not.toHaveProperty("createdAtMs");
    expect(body.clients[0]).not.toHaveProperty("operations");
  });

  it("applies defaults, search and pagination bounds", async () => {
    const { clients, request, authorization } = createHarness();
    for (const firstname of ["Ada", "Grace", "Katherine"]) {
      await clients.create(
        {
          firstname,
          lastname: "Engineer",
          email: `${firstname.toLowerCase()}@example.com`,
        },
        1,
      );
    }

    const defaults = await request("/clients", {
      headers: { Authorization: authorization() },
    });
    expect(await defaults.json()).toMatchObject({
      page: 1,
      limit: 10,
      total: 3,
    });

    const search = await request("/clients?search=grace", {
      headers: { Authorization: authorization(2) },
    });
    expect((await search.json()).clients).toHaveLength(1);

    for (const query of [
      "page=0",
      "page=1.5",
      "limit=0",
      "limit=51",
      `search=${"x".repeat(51)}`,
    ]) {
      const invalid = await request(`/clients?${query}`, {
        headers: { Authorization: authorization() },
      });
      expect(invalid.status).toBe(400);
    }
  });

  it("requires a valid app identity and authenticated active user", async () => {
    const { request, authorization } = createHarness();
    expect((await request("/clients")).status).toBe(401);
    expect(
      (
        await request("/clients", {
          headers: { Authorization: "Bearer invalid" },
        })
      ).status,
    ).toBe(401);
    expect(
      (
        await request("/clients", {
          headers: { Authorization: authorization(), "X-App-Id": "wrong-spa" },
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await request("/clients", {
          headers: { Authorization: authorization(3) },
        })
      ).status,
    ).toBe(401);
  });
});
