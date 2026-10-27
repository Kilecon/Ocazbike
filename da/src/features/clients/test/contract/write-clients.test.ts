import { describe, expect, it } from "bun:test";
import { createHarness } from "./helpers";

describe("client write contract", () => {
  it("allows either contact and returns normalized personal and professional fields", async () => {
    const { request, authorization, json } = createHarness();
    const admin = { Authorization: authorization() };

    const individual = await request("/clients", {
      method: "POST",
      headers: admin,
      ...json({
        firstname: "Ada",
        lastname: "Lovelace",
        phonenumber: " 0600000000 ",
        identityCardNumber: " ID-123 ",
      }),
    });
    const individualBody = await individual.json();
    expect(individual.status).toBe(201);
    expect(individualBody.phonenumber).toBe("0600000000");
    expect(individualBody.identityCardNumber).toBe("ID-123");
    expect(individualBody).toHaveProperty("modifiedByUserId", 1);

    const professional = await request("/clients", {
      method: "POST",
      headers: { Authorization: authorization(2) },
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
    const { request, authorization, json } = createHarness();
    const invalidInputs = [
      { firstname: "A", lastname: "B" },
      {
        firstname: "A",
        lastname: "B",
        email: "invalid",
        phonenumber: "0600000000",
      },
      {
        firstname: "A",
        lastname: "B",
        email: "a@example.com",
        isProfessional: true,
        siret: 123,
      },
    ];

    for (const body of invalidInputs) {
      const response = await request("/clients", {
        method: "POST",
        headers: { Authorization: authorization() },
        ...json(body),
      });
      expect(response.status).toBe(400);
    }
  });

  it("applies the same contact validation to updates", async () => {
    const { clients, request, authorization, json } = createHarness();
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
        phonenumber: "0600000000",
      },
    ];

    for (const body of invalidInputs) {
      const response = await request("/clients/1", {
        method: "PUT",
        headers: { Authorization: authorization() },
        ...json(body),
      });
      expect(response.status).toBe(400);
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
      headers: { Authorization: authorization(2) },
      ...json(body),
    });
    expect(denied.status).toBe(403);

    const updated = await request("/clients/1", {
      method: "PUT",
      headers: { Authorization: authorization() },
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
