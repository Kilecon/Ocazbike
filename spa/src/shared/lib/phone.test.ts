import { describe, expect, it } from "bun:test";
import { isValidPhoneNumber } from "./phone";

describe("phone input validation", () => {
  it.each([
    "06.00.00.00.00",
    "06 00 00 00 00",
    "+33 (0)6 00 00 00 00",
    "0033600000000",
    "+33 6 00 00 00 00",
  ])("accepts %s", (phone) => {
    expect(isValidPhoneNumber(phone)).toBe(true);
  });
  it.each([
    "abcdefg",
    "123",
    "+1234567890123456",
    "06+12345678",
    "1234567890",
    "061234567",
    "+1 123 456 7890",
    "Appelez le 06 00 00 00 00",
  ])("rejects %s", (phone) => {
    expect(isValidPhoneNumber(phone)).toBe(false);
  });
  it("does not consider empty or whitespace-only values to be phone numbers", () => {
    expect(isValidPhoneNumber("")).toBe(false);
    expect(isValidPhoneNumber("   ")).toBe(false);
  });
});
