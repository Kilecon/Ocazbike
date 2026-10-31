import { useTranslation } from "react-i18next";
import { StatusBadge } from "../../../components/admin/StatusBadge";
import type { BillingOperationListItemDTO } from "../../../services/types";

export function InvoicePayment({
  operation,
}: {
  operation: Pick<BillingOperationListItemDTO, "snapshots">;
}) {
  const { t } = useTranslation();
  const invoice = operation.snapshots.find(({ kind }) => kind === "invoice");
  if (!invoice) return <span>{t("notInvoiced")}</span>;
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <StatusBadge
        status={invoice.status === "paid" ? "paid" : "payment_pending"}
      />
      {invoice.paymentMethod ? (
        <span>{t(`payment_${invoice.paymentMethod}`)}</span>
      ) : null}
    </span>
  );
}
