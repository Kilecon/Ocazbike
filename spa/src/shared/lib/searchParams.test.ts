import { describe, expect, it } from "bun:test";
import { parseSearch, stringifySearch } from "./searchParams";

describe("search params", () => {
  it("keeps values as plain strings", () => {
    expect(parseSearch("?status=paid,cancelled&search=42")).toEqual({
      status: "paid,cancelled",
      search: "42",
    });
  });

  it("omits empty values and round-trips", () => {
    const query = stringifySearch({
      status: "pending",
      tab: undefined,
      search: "",
    });
    expect(query).toBe("?status=pending");
    expect(stringifySearch({})).toBe("");
    expect(parseSearch(query)).toEqual({ status: "pending" });
  });
});
