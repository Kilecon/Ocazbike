import { Bell } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatLocalDate } from "@/shared/lib/date";
import { Button } from "@/shared/ui/Button";
import { canResendNotification } from "./notification";
import type { SupportRequestDTO } from "./types";

export function SupportNotificationCell({
  request,
  resending,
  onResend,
}: Readonly<{
  request: SupportRequestDTO;
  resending: boolean;
  onResend: (request: SupportRequestDTO) => void;
}>) {
  const { t, i18n } = useTranslation();
  const canResend = canResendNotification(request);
  const isSending =
    (request.discordNotificationStatus === "sending" && !canResend) ||
    resending;
  const actionLabel = t(
    isSending ? "supportNotificationSending" : "supportNotificationResend",
  );
  const notificationStatus = request.discordNotifiedAt
    ? t("emailSentOn", {
        date: formatLocalDate(
          new Date(request.discordNotifiedAt).getTime(),
          i18n.language,
        ),
      })
    : t("emailNotSent");

  return (
    <div className="grid min-w-0 justify-items-start gap-1">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={!canResend || isSending}
        title={
          request.status === "closed" ? t("supportClosedNoResend") : undefined
        }
        aria-label={`${actionLabel} — ${notificationStatus}`}
        onClick={() => onResend(request)}
      >
        <Bell size="0.9375rem" aria-hidden="true" />
        {actionLabel}
      </Button>
      <span className="text-xs whitespace-nowrap text-muted">
        {notificationStatus}
      </span>
    </div>
  );
}
