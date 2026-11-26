import { describe, expect, it } from "bun:test";
import { jsonBody } from "../../../../tests-helpers/jsonBody";
import { createHarness } from "./helpers";

async function expectInvalidRequests(
  request: ReturnType<typeof createHarness>["request"],
  path: string,
  method: "POST" | "PUT",
  cookie: string,
  bodies: unknown[],
) {
  for (const body of bodies) {
    const response = await request(path, {
      method,
      headers: { Cookie: cookie },
      ...jsonBody(body),
    });
    expect(response.status).toBe(400);
  }
}

describe("client write contract", () => {
  it("allows either contact and returns normalized personal and professional fields", async () => {
    const { request, authorization, json } = createHarness();
    const admin = { Cookie: authorization() };

    const individual = await request("/clients", {
      method: "POST",
      headers: admin,
      ...json({
        firstname: "Ada",
        lastname: "Lovelace",
        phonenumber: " 06 00 00 00 00 ",
        identityCardNumber: " ID-123 ",
      }),
    });
    const individualBody = await individual.json();
    expect(individual.status).toBe(201);
    expect(individualBody.phonenumber).toBe("06 00 00 00 00");
    expect(individualBody.identityCardNumber).toBe("ID-123");
    expect(individualBody).toHaveProperty("modifiedByUserId", 1);

    const professional = await request("/clients", {
      method: "POST",
      headers: { Cookie: authorization(2) },
      ...json({
        firstname: "Grace",
        lastname: "Hopper",
        email: "grace@example.com",
        isProfessional: true,
        siret: "12345678901234",
        companyName: "Compilers Inc.",
      }),
    });
    const professionalBody = await professional.json();
    expect(professional.status).toBe(201);
    expect(professionalBody).toMatchObject({
      isProfessional: true,
      siret: "12345678901234",
      companyName: "Compilers Inc.",
    });
  });

  it("rejects missing contacts, invalid email, and professional fields on individuals", async () => {
    const { request, authorization } = createHarness();
    const invalidInputs = [
      { firstname: "A", lastname: "B" },
      {
        firstname: "A",
        lastname: "B",
        email: "invalid",
        phonenumber: "06 00 00 00 00",
      },
      {
        firstname: "A",
        lastname: "B",
        email: "a@example.com",
        isProfessional: true,
        siret: 123,
      },
    ];

    await expectInvalidRequests(
      request,
      "/clients",
      "POST",
      authorization(),
      invalidInputs,
    );
  });

  it("applies the same contact validation to updates", async () => {
    const { clients, request, authorization } = createHarness();
    await clients.create(
      { firstname: "Ada", lastname: "Lovelace", email: "ada@example.com" },
      1,
    );
    const invalidInputs = [
      { firstname: "Ada", lastname: "Lovelace" },
      {
        firstname: "Ada",
        lastname: "Lovelace",
        email: "",
        phonenumber: "   ",
      },
      {
        firstname: "Ada",
        lastname: "Lovelace",
        email: "invalid",
        phonenumber: "06 00 00 00 00",
      },
    ];

    await expectInvalidRequests(
      request,
      "/clients/1",
      "PUT",
      authorization(),
      invalidInputs,
    );
  });

  it("validates names and phone numbers on both create and update", async () => {
    const { clients, request, authorization } = createHarness();
    await clients.create(
      { firstname: "Ada", lastname: "Lovelace", email: "ada@example.com" },
      1,
    );
    const cookie = authorization();
    const invalid = [
      { firstname: " ", lastname: "B", email: "a@example.com" },
      { firstname: "A", lastname: "B", phonenumber: "abcdefg" },
      {
        firstname: "A",
        lastname: "B",
        email: "a@example.com",
        phonenumber: "123",
      },
      { firstname: "A", lastname: "B", phonenumber: "+1234567890123456" },
      { firstname: "A", lastname: "B", phonenumber: "06+12345678" },
      { firstname: "A", lastname: "B", phonenumber: "1234567890" },
      { firstname: "A", lastname: "B", phonenumber: "061234567" },
      {
        firstname: "A",
        lastname: "B",
        email: "a@example.com",
        phonenumber: "+1 123 456 7890",
      },
    ];
    await expectInvalidRequests(request, "/clients", "POST", cookie, invalid);
    await expectInvalidRequests(request, "/clients/1", "PUT", cookie, invalid);

    for (const phone of [
      "06 00 00 00 00",
      "+33 (0)6 00 00 00 00",
      "+33 6 00 00 00 00",
    ]) {
      const response = await request("/clients", {
        method: "POST",
        headers: { Cookie: cookie },
        ...jsonBody({ firstname: "A", lastname: "B", phonenumber: phone }),
      });
      expect(response.status).toBe(201);
    }
  });

  it("allows only Admin users to update clients and preserves creation time", async () => {
    const { clients, request, authorization, json } = createHarness();
    await clients.create(
      { firstname: "Ada", lastname: "Lovelace", email: "ada@example.com" },
      1,
    );
    const body = {
      firstname: "Ada",
      lastname: "Lovelace",
      email: "ada@example.com",
      isProfessional: true,
      companyName: "Analytical Engines",
    };

    const denied = await request("/clients/1", {
      method: "PUT",
      headers: { Cookie: authorization(2) },
      ...json(body),
    });
    expect(denied.status).toBe(403);

    const updated = await request("/clients/1", {
      method: "PUT",
      headers: { Cookie: authorization() },
      ...json(body),
    });
    const result = await updated.json();
    expect(updated.status).toBe(200);
    expect(result).toMatchObject({
      isProfessional: true,
      companyName: "Analytical Engines",
    });
    expect(result).not.toHaveProperty("modifiedByUserId");
    expect(result).not.toHaveProperty("operations");
  });
});
