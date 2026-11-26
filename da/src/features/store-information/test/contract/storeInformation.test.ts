import { describe, expect, it } from "bun:test";
import { EMPTY_STORE_INFORMATION } from "../../model";
import { createHarness } from "./helpers";

const information = {
  name: "EntrepriseInconnue",
  address: "2 Rue Pas Ici",
  phone: "06 00 00 00 00",
  secondaryPhone: "06 00 00 00 00",
  email: "store@example.test",
  siret: "12345678901234",
  apeCode: "4649Z",
  vatNumber: "FR00123456789",
  bankName: "BanqueInconnue",
  iban: "FR001234",
  bic: "BIC_INCONNU",
};

describe("store information API contract", () => {
  it("returns empty values and updates then returns the complete store record", async () => {
    const { request, repository, adminAuthorization } = createHarness();
    const empty = await request("/store-information", {
      headers: { Cookie: adminAuthorization },
    });
    expect(empty.status).toBe(200);
    expect(await empty.json()).toEqual(EMPTY_STORE_INFORMATION);

    const update = await request("/store-information", {
      method: "PUT",
      headers: { Cookie: adminAuthorization },
      body: JSON.stringify(information),
    });
    expect(update.status).toBe(200);
    expect(await update.json()).toEqual(information);
    expect(repository.value).toEqual(information);

    const read = await request("/store-information", {
      headers: { Cookie: adminAuthorization },
    });
    expect(await read.json()).toEqual(information);
  });

  it("requires an authenticated Admin for both methods", async () => {
    const { request, subadminAuthorization, json } = createHarness();
    const cases = [
      ["/store-information", {}, 401],
      [
        "/store-information",
        { headers: { Cookie: "access_token=invalid" } },
        401,
      ],
      [
        "/store-information",
        { headers: { Cookie: subadminAuthorization } },
        403,
      ],
      [
        "/store-information",
        {
          method: "PUT",
          headers: { Cookie: subadminAuthorization },
          ...json(information),
        },
        403,
      ],
    ] as const;
    for (const [path, init, status] of cases) {
      const response = await request(path, init);
      expect(response.status).toBe(status);
    }
  });

  it("trims fields before validation and formats both phone numbers", async () => {
    const { request, adminAuthorization } = createHarness();
    const response = await request("/store-information", {
      method: "PUT",
      headers: { Cookie: adminAuthorization },
      body: JSON.stringify(
        Object.fromEntries(
          Object.entries({
            ...information,
            phone: "0600000000",
            secondaryPhone: "0600000000",
          }).map(([field, value]) => [field, ` ${value} `]),
        ),
      ),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(information);
  });

  it.each(["phone", "secondaryPhone"] as const)(
    "rejects structurally invalid %s numbers without updating the store",
    async (field) => {
      const { request, repository, adminAuthorization } = createHarness();
      for (const number of ["1234567890", "+1 123 456 7890"]) {
        const response = await request("/store-information", {
          method: "PUT",
          headers: { Cookie: adminAuthorization },
          body: JSON.stringify({ ...information, [field]: number }),
        });
        expect(response.status).toBe(400);
        expect(repository.value).toEqual(EMPTY_STORE_INFORMATION);
      }
    },
  );

  it("accepts and formats international store phone numbers", async () => {
    const { request, adminAuthorization } = createHarness();
    const response = await request("/store-information", {
      method: "PUT",
      headers: { Cookie: adminAuthorization },
      body: JSON.stringify({
        ...information,
        phone: "+33600000000",
        secondaryPhone: "0033600000000",
      }),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      phone: "+33 6 00 00 00 00",
      secondaryPhone: "+33 6 00 00 00 00",
    });
  });

  it("rejects malformed, incomplete, oversized, and invalid-email updates", async () => {
    const { request, adminAuthorization } = createHarness();
    const cases = [
      {
        body: "{",
        code: "INVALID_JSON",
        message: "Malformed JSON body",
      },
      {
        body: JSON.stringify({ name: "Incomplete" }),
        code: "BAD_REQUEST",
        message: "Invalid request data",
      },
      {
        body: JSON.stringify({ ...information, email: "not-an-email" }),
        code: "BAD_REQUEST",
        message: "Invalid request data",
      },
      {
        body: JSON.stringify({ ...information, phone: "not-a-phone-number" }),
        code: "BAD_REQUEST",
        message: "Invalid request data",
      },
      {
        body: JSON.stringify({ ...information, secondaryPhone: "invalid" }),
        code: "BAD_REQUEST",
        message: "Invalid request data",
      },
      {
        body: JSON.stringify({ ...information, name: "x".repeat(121) }),
        code: "BAD_REQUEST",
        message: "Invalid request data",
      },
    ];

    for (const { body, code, message } of cases) {
      const response = await request("/store-information", {
        method: "PUT",
        headers: { Cookie: adminAuthorization },
        body,
      });
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ code, message });
    }
  });
});
