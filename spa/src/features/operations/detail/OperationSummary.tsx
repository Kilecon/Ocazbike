import { useTranslation } from "react-i18next";
import { RepairDates } from "../RepairDates";
import type { BillingOperationDTO } from "../types";
import { InvoicePayment } from "./InvoicePayment";

export function OperationSummary({
  operation,
  closedAt,
  language,
  formatDate,
}: Readonly<{
  operation: BillingOperationDTO;
  closedAt: number | null;
  language: string;
  formatDate: (timestamp: number | null) => string;
}>) {
  const { t } = useTranslation();
  const { client } = operation;
  return (
    <section className="grid shrink-0 gap-4 rounded-xl bg-[var(--oz-input-surface-disabled)] px-5 py-4 md:grid-cols-2">
      <div>
        <h2 className="m-0 mb-2 text-base font-semibold text-foreground">
          {t("client")}
        </h2>
        <p className="m-0 text-sm text-foreground">
          {client.firstname} {client.lastname}
        </p>
        <p className="m-0 text-sm text-muted">{client.email}</p>
        <p className="m-0 text-sm text-muted">{client.phonenumber}</p>
        {client.address && (
          <p className="m-0 text-sm text-muted">
            {client.address}
            {client.addressComplement ? `, ${client.addressComplement}` : ""}
          </p>
        )}
      </div>
      <div>
        <h2 className="m-0 mb-2 text-base font-semibold text-foreground">
          {t("operationDetails")}
        </h2>
        <RepairDates
          createdAt={operation.date}
          closedAt={closedAt}
          language={language}
        />
        <p className="m-0 text-sm text-muted">
          {t("servicePeriod")}:{" "}
          {formatDate(operation.serviceStartAt ?? operation.date)} —{" "}
          {formatDate(operation.serviceEndAt ?? closedAt)}
        </p>
        {operation.comment && (
          <p className="m-0 whitespace-pre-wrap text-sm text-muted">
            {operation.comment}
          </p>
        )}
        <div className="text-sm text-muted">
          {t("invoicePayment")}: <InvoicePayment operation={operation} />
        </div>
      </div>
    </section>
  );
}
