import { describe, expect, it } from "bun:test";
import { formatSupportReference } from "../../ISupportRequestRepository";

describe("formatSupportReference", () => {
  it("formats daily incremental identifiers and grows beyond three digits", () => {
    expect(formatSupportReference("SR", "2026-10-04", 1)).toBe(
      "SR-2026-10-04-001",
    );
    expect(formatSupportReference("INC", "2026-10-04", 1000)).toBe(
      "INC-2026-10-04-1000",
    );
  });

  it("rejects invalid dates and sequence numbers", () => {
    expect(() => formatSupportReference("BUG", "20261004", 1)).toThrow();
    expect(() => formatSupportReference("BUG", "2026-10-04", 0)).toThrow();
  });
});
