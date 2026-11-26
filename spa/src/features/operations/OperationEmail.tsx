import { Mail } from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { formatLocalDate } from "@/shared/lib/date";
import { useAdminToast } from "@/shared/ui/AdminToast";
import { Button } from "@/shared/ui/Button";
import { sendOperationEmail } from "./api";
import { useOperationsChanged } from "./queries";
import type {
  BillingDocumentKind,
  BillingEmailDeliveryDTO,
  BillingSnapshotDTO,
} from "./types";

const emailErrorTranslationKeys = {
  EMAIL_ALREADY_SENT_TODAY: "emailErrorAlreadySentToday",
  CLIENT_EMAIL_MISSING: "emailErrorClientEmailMissing",
  EMAIL_NOT_CONFIGURED: "emailErrorNotConfigured",
  EMAIL_DELIVERY_FAILED: "emailErrorDeliveryFailed",
  DOCUMENT_NOT_FOUND: "emailErrorDocumentNotFound",
} as const;

const emailDayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Paris",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function emailErrorKey(code: string | undefined) {
  return code && code in emailErrorTranslationKeys
    ? emailErrorTranslationKeys[code as keyof typeof emailErrorTranslationKeys]
    : undefined;
}

/** Toasts the outcome of an email requested alongside a create or pay action. */
export function useBillingEmailFeedback() {
  const { t } = useTranslation();
  const { showToast } = useAdminToast();
  return useCallback(
    (delivery: BillingEmailDeliveryDTO | undefined, recipient: string) => {
      if (!delivery) return;
      if (delivery.status === "sent") {
        showToast(
          "success",
          t("toastSuccess"),
          t(delivery.kind === "quote" ? "quoteEmailSent" : "invoiceEmailSent", {
            email: recipient,
          }),
        );
        return;
      }
      const key = emailErrorKey(delivery.code);
      showToast(
        "warning",
        t("documentEmailFailed"),
        key ? t(key) : delivery.message,
      );
    },
    [showToast, t],
  );
}

/** The invoice supersedes the quote once it exists. */
export function emailableSnapshot<T extends Pick<BillingSnapshotDTO, "kind">>(
  snapshots: readonly T[],
): T | undefined {
  return (
    snapshots.find(({ kind }) => kind === "invoice") ??
    snapshots.find(({ kind }) => kind === "quote")
  );
}

export function OperationEmailButton({
  operationId,
  clientEmail,
  snapshots,
  language,
}: Readonly<{
  operationId: number;
  clientEmail: string | null | undefined;
  snapshots: readonly Pick<BillingSnapshotDTO, "kind" | "emailSentAt">[];
  language: string;
}>) {
  const { t } = useTranslation();
  const { showToast, showErrorToast } = useAdminToast();
  const operationsChanged = useOperationsChanged();
  const [sending, setSending] = useState(false);
  const [lastDelivery, setLastDelivery] = useState<{
    kind: BillingDocumentKind;
    sentAt: number;
  } | null>(null);
  const snapshot = emailableSnapshot(snapshots);
  const kind: BillingDocumentKind | undefined = snapshot?.kind;
  const sentAt =
    lastDelivery && lastDelivery.kind === kind
      ? Math.max(
          lastDelivery.sentAt,
          snapshot?.emailSentAt ?? lastDelivery.sentAt,
        )
      : (snapshot?.emailSentAt ?? null);
  const sentToday =
    sentAt !== null &&
    emailDayFormatter.format(sentAt) === emailDayFormatter.format(Date.now());

  let disabledReason: string | undefined;
  if (!kind) disabledReason = t("noDocumentToEmail");
  else if (!clientEmail) disabledReason = t("clientEmailMissingHint");
  else if (sentToday) disabledReason = t("emailErrorAlreadySentToday");

  const actionLabel = kind
    ? t(kind === "quote" ? "sendQuoteEmailAction" : "sendInvoiceEmailAction")
    : t("noDocumentToEmail");
  const sentStatus = sentAt
    ? t("emailSentOn", { date: formatLocalDate(sentAt, language) })
    : t("emailNotSent");
  const actionText = sentAt ? t("resendDocumentEmail") : t("sendDocumentEmail");

  const send = async () => {
    if (!kind || !clientEmail || sending || disabledReason !== undefined)
      return;
    setSending(true);
    try {
      const result = await sendOperationEmail(operationId, kind);
      setLastDelivery(result);
      const successKey =
        result.kind === "quote" ? "quoteEmailSent" : "invoiceEmailSent";
      showToast(
        "success",
        t("toastSuccess"),
        t(successKey, {
          email: clientEmail,
        }),
      );
      await operationsChanged();
    } catch (error: unknown) {
      showErrorToast(error, t("emailErrorDeliveryFailed"));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid justify-items-start gap-1">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={sending || disabledReason !== undefined}
        title={disabledReason ?? actionLabel}
        aria-label={`${actionLabel} — ${sentStatus}`}
        onClick={(event) => {
          event.stopPropagation();
          void send();
        }}
      >
        <Mail size="0.9375rem" aria-hidden="true" />
        {actionText}
      </Button>
    </div>
  );
}
