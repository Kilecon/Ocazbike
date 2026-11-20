import { describe, expect, it } from "bun:test";
import { formatDateTime, formatLocalDate } from "./date";

describe("localized date and time", () => {
  const afternoon = new Date(2026, 9, 26, 15, 4, 5).getTime();
  const midnight = new Date(2026, 9, 26, 0, 4, 5).getTime();

  it.each(["fr", "fr-FR", "fr-CA"])(
    "uses a 24-hour clock for %s",
    (language) => {
      expect(formatDateTime(afternoon, language)).toContain("15:04:05");
      expect(formatDateTime(midnight, language)).toContain("00:04:05");
      expect(formatDateTime(afternoon, language)).not.toMatch(/AM|PM/);
    },
  );

  it.each(["en", "en-US", "en-GB"])(
    "uses a 12-hour clock for %s",
    (language) => {
      expect(formatDateTime(afternoon, language)).toMatch(/3:04:05\s*PM/);
      expect(formatDateTime(midnight, language)).toMatch(/12:04:05\s*AM/);
    },
  );

  it("formats UTC timestamps in the browser's local time zone", () => {
    const timestamp = Date.UTC(2026, 9, 27, 1, 30, 0);
    const expected = new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "short",
      timeStyle: "medium",
      hourCycle: "h23",
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }).format(timestamp);

    expect(formatDateTime(timestamp, "fr")).toBe(expected);
  });
});

describe("localized date", () => {
  it("uses the browser locale's numeric date format", () => {
    const timestamp = new Date(2026, 9, 27, 12).getTime();
    const expected = new Intl.DateTimeFormat(
      typeof navigator === "undefined" ? undefined : navigator.language,
      { day: "2-digit", month: "2-digit", year: "numeric" },
    ).format(timestamp);

    expect(formatLocalDate(timestamp)).toBe(expected);
  });
});
