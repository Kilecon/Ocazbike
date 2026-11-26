import { useTranslation } from "react-i18next";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { OperationDocuments } from "../OperationDocuments";
import type { BillingOperationDTO } from "../types";

export function OperationDocumentsList({
  operation,
  formatDate,
}: Readonly<{
  operation: BillingOperationDTO;
  formatDate: (timestamp: number | null) => string;
}>) {
  const { t } = useTranslation();
  return (
    <section className="grid shrink-0 gap-3">
      <h2 className="oz-card-title m-0 text-foreground">
        {t("billingDocuments")}
      </h2>
      {operation.snapshots.map((snapshot) => {
        const payloadDocumentNumber = snapshot.payload.documentNumber;
        const documentNumber =
          typeof payloadDocumentNumber === "string" ||
          typeof payloadDocumentNumber === "number"
            ? String(payloadDocumentNumber)
            : "";
        return (
          <article
            className="flex flex-wrap items-center justify-between gap-3 rounded border border-border px-3 py-2.5"
            key={snapshot.kind}
          >
            <div>
              <strong className="text-foreground">
                {snapshot.kind === "quote"
                  ? t("quoteNumber", { number: documentNumber })
                  : t("invoiceNumber", { number: documentNumber })}
              </strong>
              <p className="m-0 text-sm text-muted">
                <StatusBadge status={snapshot.status} />
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="grid justify-items-end text-xs text-muted">
                <span>{formatDate(snapshot.createdAt)}</span>
                <span>
                  {snapshot.emailSentAt
                    ? t("emailSentOn", {
                        date: formatDate(snapshot.emailSentAt),
                      })
                    : t("emailNotSent")}
                </span>
              </span>
              <OperationDocuments
                operationId={operation.id}
                type={operation.type}
                snapshots={[snapshot]}
                kinds={[snapshot.kind]}
                labels={{
                  quote: t("openQuote"),
                  invoice: t("openInvoice"),
                  missingQuote: t("missingQuote"),
                  missingInvoice: t("missingInvoice"),
                }}
              />
            </div>
          </article>
        );
      })}
    </section>
  );
}
