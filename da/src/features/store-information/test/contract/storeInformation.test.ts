import { describe, expect, it } from "bun:test";
import { EMPTY_STORE_INFORMATION } from "../../model";
import { createHarness } from "./helpers";

const information = {
  name: "Ocazbike",
  address: "8 Avenue de Picot\n33320 Eysines",
  phone: "06 00 00 00 00",
  email: "store@example.test",
  siret: "12345678901234",
  apeCode: "4649Z",
  vatNumber: "FR00123456789",
  bankName: "Crédit Agricole",
  iban: "FR001234",
  bic: "AGRIFRPP",
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
