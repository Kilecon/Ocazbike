import { X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { formatLocalDate } from "@/shared/lib/date";
import { Button } from "@/shared/ui/Button";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import {
  acceptQuote,
  completeOperation,
  payOperation,
  rejectQuote,
} from "../api";
import { EmailToggle } from "../EmailToggle";
import {
  availableTransitions,
  awaitsPayment,
  closedAtOf,
  hasZeroTotal,
  type OperationSuccessMessage,
} from "../model/workflow";
import type { BillingOperationDTO } from "../types";
import { OperationActions } from "./OperationActions";
import { OperationDocumentsList } from "./OperationDocumentsList";
import { OperationLinesTable } from "./OperationLinesTable";
import { OperationSummary } from "./OperationSummary";

const transitionRequests = {
  accept: acceptQuote,
  reject: rejectQuote,
  complete: completeOperation,
} as const;

export function OperationDetail({
  operation,
  loading,
  saving,
  title,
  language,
  onBack,
  onAction,
  onReload,
}: Readonly<{
  operation: BillingOperationDTO | null;
  loading: boolean;
  saving: boolean;
  title: string;
  language: string;
  onBack: () => void;
  onAction: (
    action: () => Promise<BillingOperationDTO>,
    successMessage: OperationSuccessMessage,
  ) => Promise<void>;
  onReload: () => Promise<void>;
}>) {
  const { t } = useTranslation();
  const [sendInvoiceEmail, setSendInvoiceEmail] = useState(true);

  if (loading) {
    return (
      <output className="block p-5 text-sm text-muted">{t("loading")}</output>
    );
  }
  if (!operation) {
    return (
      <section className="oz-card mx-auto max-w-[77.5rem] p-5">
        <p className="text-muted">{t("operationNotFound")}</p>
      </section>
    );
  }

  const clientEmail = operation.client.email?.trim() ?? "";
  const zeroTotal = hasZeroTotal(operation);
  let payment: "zero" | "due" | "none" = "none";
  if (awaitsPayment(operation)) {
    payment = zeroTotal ? "zero" : "due";
  }
  const formatDate = (timestamp: number | null) =>
    timestamp === null
      ? t("notSpecified")
      : formatLocalDate(timestamp, language);

  return (
    <div className="flex max-h-[calc(100dvh-2.125rem)] min-h-0 flex-col">
      <header className="flex shrink-0 items-start justify-between gap-4 border-b border-border p-5">
        <div className="grid min-w-0 flex-1 gap-2">
          <h2 className="oz-card-title m-0 break-words text-foreground">
            {title} · {t("operationNumber", { id: operation.id })}
          </h2>
          <div className="flex items-center justify-between gap-4">
            <p className="m-0 min-w-0 text-muted">
              {operation.client.firstname} {operation.client.lastname} ·{" "}
              {formatDate(operation.date)}
            </p>
            <StatusBadge status={operation.status} />
          </div>
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          disabled={saving}
          aria-label={t("modalClose")}
          onClick={onBack}
        >
          <X size="1.25rem" aria-hidden="true" />
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-5">
        {operation.snapshots.length > 0 && (
          <OperationDocumentsList
            operation={operation}
            formatDate={formatDate}
          />
        )}
        <OperationSummary
          operation={operation}
          closedAt={closedAtOf(operation)}
          language={language}
          formatDate={formatDate}
        />
        <OperationLinesTable lines={operation.lines} />
        {payment === "due" && (
          <div className="shrink-0">
            <EmailToggle
              id="operation-send-invoice-email"
              variant="switch"
              label={t("sendInvoiceEmail")}
              checked={sendInvoiceEmail && clientEmail !== ""}
              disabled={saving}
              missingEmail={!clientEmail}
              onChange={setSendInvoiceEmail}
            />
          </div>
        )}
      </div>

      <OperationActions
        saving={saving}
        payment={payment}
        transitions={availableTransitions(operation)}
        onClose={onBack}
        onPay={(method) =>
          void onAction(
            () =>
              payOperation(
                operation.id,
                method,
                sendInvoiceEmail && clientEmail !== "",
              ),
            "operationPaid",
          )
        }
        onTransition={({ transition, success }) =>
          void onAction(
            () => transitionRequests[transition](operation.id),
            success,
          ).then(onReload)
        }
      />
    </div>
  );
}
