import { describe, expect, it } from "bun:test";
import { isValidEmail } from "./email";

describe("email validation", () => {
  it.each(["person@example.com", "prenom.nom+tag@example.fr"])(
    "accepts %s",
    (email) => {
      expect(isValidEmail(email)).toBe(true);
    },
  );

  it.each([
    "",
    "not-an-email",
    "person @example.com",
    "person@example",
    "@example.com",
  ])("rejects %s", (email) => {
    expect(isValidEmail(email)).toBe(false);
  });
});
