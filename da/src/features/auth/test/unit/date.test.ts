import { describe, expect, it } from "bun:test";
import { formatUtcDate, iso8601ToUtcTimestamp } from "../../date";

describe("auth date helpers", () => {
  it("formats UTC dates with zero-padded components", () => {
    expect(formatUtcDate(new Date("2026-01-02T03:04:05.000Z"))).toBe(
      "2026/01/02 : 03:04:05",
    );
  });

  it("parses UTC timestamps and timezone offsets to the same instant", () => {
    const utc = iso8601ToUtcTimestamp("2026-10-17T13:39:58Z");
    expect(utc).toBe(Date.UTC(2026, 9, 17, 13, 39, 58));
    expect(iso8601ToUtcTimestamp("2026-10-17T15:39:58+02:00")).toBe(utc);
    expect(iso8601ToUtcTimestamp("2026-10-17T08:39:58-05:00")).toBe(utc);
  });

  it("rejects malformed, timezone-free, and out-of-range values", () => {
    for (const input of [
      "2026-10-17T13:39:58",
      "not-a-date",
      "2026-13-17T13:39:58Z",
      "2026-10-17T24:00:00Z",
      "2026-10-17T13:60:00Z",
      "2026-10-17T13:39:60Z",
      "2026-10-17T13:39:58+24:00",
      "2026-10-17T13:39:58+02:60",
    ]) {
      expect(() => iso8601ToUtcTimestamp(input)).toThrow();
    }
  });

  it("rejects impossible calendar dates", () => {
    expect(() => iso8601ToUtcTimestamp("2026-02-30T10:00:00Z")).toThrow(
      "Invalid date/time values",
    );
    expect(() => iso8601ToUtcTimestamp("2024-02-29T10:00:00Z")).not.toThrow();
  });
});
