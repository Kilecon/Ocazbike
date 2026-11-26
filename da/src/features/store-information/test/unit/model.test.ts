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
      "",
    ]);
  });

  it("trims every field and formats only phones", () => {
    expect(
      normalizeStoreInformation({
        name: " EntrepriseInconnue ",
        address: " 2 Rue Pas Ici ",
        phone: " 0600000000 ",
        secondaryPhone: " 0600000000 ",
        email: " shop@example.test ",
        siret: " 123 ",
        apeCode: " 4649Z ",
        vatNumber: " FR00 ",
        bankName: " BanqueInconnue ",
        iban: " FR00 ",
        bic: " BIC_INCONNU ",
      }),
    ).toEqual({
      name: "EntrepriseInconnue",
      address: "2 Rue Pas Ici",
      phone: "06 00 00 00 00",
      secondaryPhone: "06 00 00 00 00",
      email: "shop@example.test",
      siret: "123",
      apeCode: "4649Z",
      vatNumber: "FR00",
      bankName: "BanqueInconnue",
      iban: "FR00",
      bic: "BIC_INCONNU",
    });
  });

  it.each([
    ["06.00.00.00.00", "06 00 00 00 00"],
    ["+33 (0)6 00 00 00 00", "+33 6 00 00 00 00"],
    ["0033600000000", "+33 6 00 00 00 00"],
    [" +33 6 00 00 00 00 ", "+33 6 00 00 00 00"],
    ["  ", ""],
  ])("formats phone %s without altering other numbers", (phone, expected) => {
    const information = normalizeStoreInformation({
      ...EMPTY_STORE_INFORMATION,
      phone,
      secondaryPhone: phone,
      siret: " 90768904600015 ",
    });
    expect(information.phone).toBe(expected);
    expect(information.secondaryPhone).toBe(expected);
    expect(information.siret).toBe("90768904600015");
  });
});
