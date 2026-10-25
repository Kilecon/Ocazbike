/**
 * Format a UTC datetime as a human-readable string.
 * Used for user-facing timestamps (logs, UI).
 *
 * @param date - JavaScript Date object (must be in UTC)
 * @returns Formatted string: YYYY/MM/DD : HH:MM:SS (UTC)
 */
export function formatUtcDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${date.getUTCFullYear()}/${pad(date.getUTCMonth() + 1)}/${pad(date.getUTCDate())} : ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
}

/**
 * Convert ISO 8601 datetime string with timezone to UTC millisecond timestamp.
 * This is the primary conversion function for API inputs.
 *
 * **Input Format (ISO 8601 with timezone):** `YYYY-MM-DDTHH:mm:ssZ`
 * - Must include timezone indicator (Z for UTC or ±HH:mm for offset)
 * - Dates without timezone are REJECTED (ambiguous timezone)
 * **Output:** Unix timestamp in milliseconds (always UTC)
 *
 * @example
 * ```typescript
 * const timestamp = iso8601ToUtcTimestamp("2026-10-17T13:39:58Z");
 * // Returns: 1729174798000 (October 17, 2026, 13:39:58 UTC)
 *
 * const timestamp = iso8601ToUtcTimestamp("2026-10-17T15:39:58+02:00");
 * // Returns: 1729174798000 (same instant, converted from UTC+2)
 * ```
 *
 * @param isoDatetime - ISO 8601 datetime string with timezone: `YYYY-MM-DDTHH:mm:ssZ` or `YYYY-MM-DDTHH:mm:ss±HH:mm`
 * @returns UTC millisecond timestamp (Unix epoch * 1000)
 * @throws Error if format is invalid, timezone is missing, or values are out of range
 */
export function iso8601ToUtcTimestamp(isoDatetime: string): number {
  // Validate format: YYYY-MM-DDTHH:mm:ss with timezone (Z or ±HH:mm)
  // Valid examples:
  // - 2026-10-17T13:39:58Z
  // - 2026-10-17T13:39:58+00:00
  // - 2026-10-17T13:39:58-05:00
  const isoRegex =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(Z|[+-]\d{2}:\d{2})$/;
  const match = isoDatetime.match(isoRegex);

  if (!match) {
    throw new Error(
      `Invalid ISO8601 datetime format: ${isoDatetime}. Expected YYYY-MM-DDTHH:mm:ssZ or YYYY-MM-DDTHH:mm:ss±HH:mm`,
    );
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const tz = match[7];
  const isLeapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [
    31,
    isLeapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];

  // Validate date/time values
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > (daysInMonth[month - 1] ?? 0) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    second < 0 ||
    second > 59
  ) {
    throw new Error(`Invalid date/time values: ${isoDatetime}`);
  }

  // Create UTC timestamp
  // First, parse as if it's UTC time
  const timestamp = Date.UTC(year, month - 1, day, hour, minute, second, 0);

  // If timezone offset is provided (not Z), adjust
  if (tz !== "Z") {
    const sign = tz[0] === "+" ? 1 : -1;
    const offsetHours = Number(tz.substring(1, 3));
    const offsetMinutes = Number(tz.substring(4, 6));
    if (offsetHours > 23 || offsetMinutes > 59) {
      throw new Error(`Invalid date/time values: ${isoDatetime}`);
    }
    const tzOffsetMs = sign * (offsetHours * 60 + offsetMinutes) * 60 * 1000;
    return timestamp - tzOffsetMs; // Subtract offset to get UTC
  }

  return timestamp;
}
