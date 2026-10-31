import { describe, expect, it } from "bun:test";
import { DataProtector } from "../../DataProtector";

describe("DataProtector", () => {
  it("uses a per-client salt and authenticated randomized AES-GCM values", () => {
    const protector = new DataProtector(Buffer.alloc(32, 9));
    const salt = protector.createSalt();
    const first = protector.encrypt("personal data", salt);
    const second = protector.encrypt("personal data", salt);

    expect(first).not.toBe(second);
    expect(protector.decrypt(first, salt.toString("base64url"))).toBe(
      "personal data",
    );
    expect(() =>
      new DataProtector(Buffer.alloc(32, 10)).decrypt(
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
    expect(() => DataProtector.fromEnvironment("not-a-key")).toThrow(
      "ENCRYPTION_KEY",
    );
    expect(DataProtector.fromEnvironment("ab".repeat(32))).toBeInstanceOf(
      DataProtector,
    );
  });

  it("round-trips nullable values and derives isolated keys for each salt", () => {
    const protector = new DataProtector(Buffer.alloc(32, 9));
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
    const protector = new DataProtector(Buffer.alloc(32, 9));
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
    const protector = new DataProtector(Buffer.alloc(32, 9));

    expect(protector.emailLookupHash(" Person@Example.com ")).toBe(
      protector.emailLookupHash("person@example.com"),
    );
    expect(protector.emailLookupHash("person@example.com")).not.toBe(
      new DataProtector(Buffer.alloc(32, 10)).emailLookupHash(
        "person@example.com",
      ),
    );
    expect(protector.searchToken("abc")).toBe(protector.searchToken("abc"));
    expect(protector.searchToken("abc")).not.toBe(protector.searchToken("abd"));
  });

  it("reuses derived keys per salt without mixing salts", () => {
    const protector = new DataProtector(Buffer.alloc(32, 9));
    const salts = Array.from({ length: 1_100 }, () => protector.createSalt());
    const values = salts.map((salt, index) =>
      protector.encrypt(`value-${index}`, salt),
    );

    values.forEach((value, index) => {
      expect(protector.decrypt(value, salts[index].toString("base64url"))).toBe(
        `value-${index}`,
      );
    });
    const fieldProtector = protector.createFieldProtector(salts[0]);
    expect(fieldProtector.decrypt(fieldProtector.encrypt("cached"))).toBe(
      "cached",
    );
  });
});
