import { describe, expect, it } from "bun:test";
import { canResendNotification } from "./notification";
import type { SupportRequestDTO } from "./types";

const now = Date.UTC(2026, 10, 25, 12);
const hoursAgo = (hours: number) =>
  new Date(now - hours * 60 * 60 * 1000).toISOString();
const request = (overrides: Partial<SupportRequestDTO>): SupportRequestDTO => ({
  id: 1,
  reference: "SR-1",
  type: "SR",
  title: "Title",
  description: "Description",
  status: "created",
  createdAt: hoursAgo(48),
  discordNotificationStatus: "sent",
  discordNotifiedAt: null,
  discordNotificationAttemptAt: null,
  ...overrides,
});

describe("canResendNotification", () => {
  it("retries failed or pending notifications of open requests only", () => {
    expect(
      canResendNotification(
        request({ discordNotificationStatus: "failed" }),
        now,
      ),
    ).toBe(true);
    expect(
      canResendNotification(
        request({ discordNotificationStatus: "pending", status: "closed" }),
        now,
      ),
    ).toBe(false);
  });

  it("waits five minutes for a stuck send and a day after a success", () => {
    const sending = { discordNotificationStatus: "sending" } as const;
    expect(
      canResendNotification(
        request({ ...sending, discordNotificationAttemptAt: hoursAgo(0.05) }),
        now,
      ),
    ).toBe(false);
    expect(
      canResendNotification(
        request({ ...sending, discordNotificationAttemptAt: hoursAgo(0.1) }),
        now,
      ),
    ).toBe(true);
    expect(
      canResendNotification(request({ discordNotifiedAt: hoursAgo(23) }), now),
    ).toBe(false);
    expect(
      canResendNotification(request({ discordNotifiedAt: hoursAgo(24) }), now),
    ).toBe(true);
  });
});
