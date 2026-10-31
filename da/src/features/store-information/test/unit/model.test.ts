import { describe, expect, it } from "bun:test";
import {
  EMPTY_STORE_INFORMATION,
  normalizeStoreInformation,
} from "../../model";

describe("store information model", () => {
  it("defines a complete empty value", () => {
    expect(Object.values(EMPTY_STORE_INFORMATION)).toEqual([
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ]);
  });

  it("trims every field without changing its content", () => {
    expect(
      normalizeStoreInformation({
        name: " Ocazbike ",
        address: " 8 Avenue de Picot\n33320 Eysines ",
        phone: " 06 00 ",
        email: " shop@example.test ",
        siret: " 123 ",
        apeCode: " 4649Z ",
        vatNumber: " FR00 ",
        bankName: " Crédit Agricole ",
        iban: " FR00 ",
        bic: " BIC0 ",
      }),
    ).toEqual({
      name: "Ocazbike",
      address: "8 Avenue de Picot\n33320 Eysines",
      phone: "06 00",
      email: "shop@example.test",
      siret: "123",
      apeCode: "4649Z",
      vatNumber: "FR00",
      bankName: "Crédit Agricole",
      iban: "FR00",
      bic: "BIC0",
    });
  });
});
