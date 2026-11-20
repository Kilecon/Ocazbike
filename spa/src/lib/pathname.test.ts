import { describe, expect, it } from "bun:test";
import { trimTrailingSlashes } from "./pathname";

describe("trimTrailingSlashes", () => {
  it.each([
    ["/admin/repairs///", "/admin/repairs"],
    ["/admin//repairs", "/admin//repairs"],
    ["/", "/"],
    ["////", "/"],
    ["", "/"],
  ])("trims %j to %j", (pathname, expected) => {
    expect(trimTrailingSlashes(pathname)).toBe(expected);
  });

  it("preserves long runs of internal slashes", () => {
    const pathname = `/admin${"/".repeat(100_000)}repairs`;
    expect(trimTrailingSlashes(`${pathname}///`)).toBe(pathname);
  });
});
