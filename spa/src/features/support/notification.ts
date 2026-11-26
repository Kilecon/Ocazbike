import type { SupportRequestDTO } from "./types";

const NOTIFICATION_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const STALE_ATTEMPT_MS = 5 * 60 * 1000;

function elapsedSince(isoDate: string | null, delayMs: number, now: number) {
  return isoDate !== null && now >= new Date(isoDate).getTime() + delayMs;
}

/**
 * Open requests can be notified again when the last attempt failed, is stuck
 * in "sending", or was sent more than a day ago.
 */
export function canResendNotification(
  request: SupportRequestDTO,
  now = Date.now(),
): boolean {
  if (request.status === "closed") return false;
  switch (request.discordNotificationStatus) {
    case "pending":
    case "failed":
      return true;
    case "sending":
      return elapsedSince(
        request.discordNotificationAttemptAt,
        STALE_ATTEMPT_MS,
        now,
      );
    case "sent":
      return elapsedSince(
        request.discordNotifiedAt,
        NOTIFICATION_COOLDOWN_MS,
        now,
      );
  }
}
