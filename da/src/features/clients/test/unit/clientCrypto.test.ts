import { describe, expect, it } from "bun:test";
import { DataProtector } from "../../../../shared/crypto/DataProtector";
import {
  clientSearchNgrams,
  decryptClient,
  decryptClientIdentity,
  normalizeClientSearch,
  searchTokensForSearch,
  searchTokensForValues,
} from "../../crypto/clientCrypto";

describe("client crypto helpers", () => {
  const protector = new DataProtector(Buffer.alloc(32, 9));

  it("derives normalized search tokens for stored values and searches", () => {
    expect(searchTokensForValues(protector, ["Été"])).toEqual(
      searchTokensForValues(protector, ["ete"]),
    );
    expect(searchTokensForValues(protector, ["Été", "ete"])).toEqual(
      searchTokensForValues(protector, ["ete"]),
    );
    expect(searchTokensForSearch(protector, "Été")).toHaveLength(1);
    expect(searchTokensForSearch(protector, "ab")).toHaveLength(3);
  });

  it("uses existing field tokens for full names without boundary trigrams", () => {
    const indexedTokens = searchTokensForValues(protector, ["Zoé", "Martin"]);
    for (const search of ["Zoé Martin", "Martin Zoé", "  ZOE   MARTIN  "]) {
      const tokens = searchTokensForSearch(protector, search);
      expect(tokens.length).toBeGreaterThan(0);
      expect(tokens.every((token) => indexedTokens.includes(token))).toBe(true);
      expect(new Set(tokens).size).toBe(tokens.length);
    }
  });

  it("normalizes accents and extracts unique n-grams for short and long searches", () => {
    expect(normalizeClientSearch("Zoé Martin")).toBe("zoemartin");
    expect(clientSearchNgrams("Été")).toContain("ete");
    expect(clientSearchNgrams("ab")).toEqual(["a", "b", "ab"]);
  });

  it("decrypts a stored client row and rejects unencrypted rows", () => {
    const salt = protector.createSalt();
    const cipher = protector.createFieldProtector(salt);
    const row = {
      id: 7,
      encryptionSalt: salt.toString("base64url"),
      firstname: cipher.encrypt("Zoé"),
      lastname: cipher.encrypt("Martin"),
      email: cipher.encrypt("zoe@example.test"),
      phonenumber: cipher.encrypt("0600000000"),
      address: null,
      addressComplement: null,
      identityCardNumber: null,
      privatenote: null,
      isProfessional: false,
      siret: null,
      companyName: null,
    };

    expect(decryptClient(protector, row)).toMatchObject({
      id: 7,
      firstname: "Zoé",
      email: "zoe@example.test",
      address: null,
    });
    expect(decryptClientIdentity(protector, row)).toEqual({
      firstname: "Zoé",
      lastname: "Martin",
      email: "zoe@example.test",
    });
    expect(() =>
      decryptClientIdentity(protector, { ...row, encryptionSalt: null }),
    ).toThrow("has not been encrypted");
    expect(() =>
      decryptClientIdentity(protector, { ...row, email: "corrupt" }),
    ).toThrow();
    expect(() =>
      decryptClient(protector, { ...row, encryptionSalt: null }),
    ).toThrow("has not been encrypted");
  });
});
