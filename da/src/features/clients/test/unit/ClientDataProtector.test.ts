import { describe, expect, it } from "bun:test";
import {
  ClientDataProtector,
  clientSearchNgrams,
  normalizeClientSearch,
} from "../../crypto/ClientDataProtector";

describe("ClientDataProtector", () => {
  it("uses a per-client salt and authenticated randomized AES-GCM values", () => {
    const protector = new ClientDataProtector(Buffer.alloc(32, 9));
    const salt = protector.createSalt();
    const first = protector.encrypt("personal data", salt);
    const second = protector.encrypt("personal data", salt);

    expect(first).not.toBe(second);
    expect(protector.decrypt(first, salt.toString("base64url"))).toBe(
      "personal data",
    );
    expect(() =>
      new ClientDataProtector(Buffer.alloc(32, 10)).decrypt(
        first,
        salt.toString("base64url"),
      ),
    ).toThrow();

    const parts = first.split(".");
    parts[3] = `${parts[3]}AA`;
    expect(() =>
      protector.decrypt(parts.join("."), salt.toString("base64url")),
    ).toThrow();
  });

  it("validates the required 256-bit hexadecimal environment key", () => {
    expect(() => ClientDataProtector.fromEnvironment("not-a-key")).toThrow(
      "CLIENT_ENCRYPTION_KEY",
    );
    expect(ClientDataProtector.fromEnvironment("ab".repeat(32))).toBeInstanceOf(
      ClientDataProtector,
    );
  });

  it("round-trips nullable values and derives isolated keys for each salt", () => {
    const protector = new ClientDataProtector(Buffer.alloc(32, 9));
    const firstSalt = protector.createSalt();
    const secondSalt = protector.createSalt();
    const encrypted = protector.encrypt("private value", firstSalt);

    expect(protector.encrypt(null, firstSalt)).toBeNull();
    expect(protector.decrypt(null, firstSalt.toString("base64url"))).toBeNull();
    expect(() =>
      protector.decrypt(encrypted, secondSalt.toString("base64url")),
    ).toThrow();
    expect(firstSalt).not.toEqual(secondSalt);
  });

  it("rejects malformed encryption data, invalid salts, and malformed Unicode", () => {
    const protector = new ClientDataProtector(Buffer.alloc(32, 9));
    const salt = protector.createSalt();

    expect(() => protector.encrypt("\ud800", salt)).toThrow(
      "well-formed Unicode",
    );
    expect(() =>
      protector.decrypt("plaintext", salt.toString("base64url")),
    ).toThrow("unsupported encryption format");
    expect(() =>
      protector.decrypt("v1.a.b.c", salt.toString("base64url")),
    ).toThrow("invalid encryption parameters");
    expect(() => protector.decrypt("v1.a.b.c", null)).toThrow(
      "without its encryption salt",
    );
  });

  it("derives deterministic, normalized lookup hashes and search tokens", () => {
    const protector = new ClientDataProtector(Buffer.alloc(32, 9));

    expect(protector.emailLookupHash(" Person@Example.com ")).toBe(
      protector.emailLookupHash("person@example.com"),
    );
    expect(protector.emailLookupHash("person@example.com")).not.toBe(
      new ClientDataProtector(Buffer.alloc(32, 10)).emailLookupHash(
        "person@example.com",
      ),
    );
    expect(protector.searchToken("abc")).toBe(protector.searchToken("abc"));
    expect(protector.searchTokens("Été")).toEqual(
      protector.searchTokens("ete"),
    );
    expect(protector.searchTokensForValues(["Été", "ete"])).toEqual(
      protector.searchTokens("ete"),
    );
    expect(protector.searchTokensForSearch("Été")).toHaveLength(1);
    expect(protector.searchTokensForSearch("ab")).toHaveLength(3);
  });

  it("normalizes accents and extracts unique n-grams for short and long searches", () => {
    expect(normalizeClientSearch("Zoé Martin")).toBe("zoemartin");
    expect(clientSearchNgrams("Été")).toContain("ete");
    expect(clientSearchNgrams("ab")).toEqual(["a", "b", "ab"]);
  });
});
