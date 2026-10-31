import { describe, expect, it } from "bun:test";
import { BcryptPasswordHasher } from "../../password";

describe("BcryptPasswordHasher", () => {
  it("hashes passwords and compares matching and non-matching input", async () => {
    const passwords = new BcryptPasswordHasher(4);
    const hash = await passwords.hash("correct horse battery staple");
    expect(hash).toStartWith("$2b$04$");
    expect(await passwords.compare("correct horse battery staple", hash)).toBe(
      true,
    );
    expect(await passwords.compare("wrong password", hash)).toBe(false);
  });

  it("verifies hashes produced by other bcrypt implementations", async () => {
    const passwords = new BcryptPasswordHasher(4);
    // OpenBSD bcrypt reference vectors.
    expect(
      await passwords.compare(
        "U*U",
        "$2a$05$CCCCCCCCCCCCCCCCCCCCC.E5YPO9kmyuRGyh0XouQYb4YMJKvyOeW",
      ),
    ).toBe(true);
    expect(
      await passwords.compare(
        "U*U*",
        "$2a$05$CCCCCCCCCCCCCCCCCCCCC.VGOzA784oUp/Z0DY336zx7pLYAy0lwK",
      ),
    ).toBe(true);
  });

  it("rejects malformed hashes instead of throwing", async () => {
    expect(
      await new BcryptPasswordHasher(4).compare("password", "not-a-hash"),
    ).toBe(false);
  });
});
