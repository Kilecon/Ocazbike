import { describe, expect, it } from "bun:test";
import { BcryptPasswordHasher } from "../../password";

describe("BcryptPasswordHasher", () => {
  it("hashes passwords and compares matching and non-matching input", async () => {
    const passwords = new BcryptPasswordHasher(4);
    const hash = await passwords.hash("correct horse battery staple");
    expect(hash).not.toBe("correct horse battery staple");
    expect(await passwords.compare("correct horse battery staple", hash)).toBe(
      true,
    );
    expect(await passwords.compare("wrong password", hash)).toBe(false);
  });
});
