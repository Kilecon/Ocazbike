import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { GridColumn } from "@/shared/ui/Grid";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { TruncatedCellText } from "@/shared/ui/TruncatedCellText";
import { summarizeLines } from "./model/billingLines";
import { OperationDocuments } from "./OperationDocuments";
import { OperationEmailButton } from "./OperationEmail";
import { RepairDates } from "./RepairDates";
import type { BillingDocumentType, BillingOperationListItemDTO } from "./types";

export function useOperationColumns({
  type,
  statusFilter,
}: Readonly<{
  type: BillingDocumentType;
  /** Filter control shown in the status column header, if any. */
  statusFilter?: ReactNode;
}>): GridColumn<BillingOperationListItemDTO>[] {
  const { t, i18n } = useTranslation();
  return [
    {
      key: "client",
      title: t("client"),
      render: (item) => (
        <div className="grid gap-1">
          <span className="font-semibold text-foreground">
            {item.client.firstname} {item.client.lastname}
          </span>
          <span className="text-xs text-muted">{item.client.email || "—"}</span>
        </div>
      ),
    },
    {
      key: "date",
      title: t("date"),
      render: (item) => (
        <RepairDates
          createdAt={item.serviceStartAt ?? item.date}
          closedAt={item.serviceEndAt}
          language={i18n.language}
          servicePeriod={type === "rental"}
        />
      ),
    },
    {
      key: "summary",
      title: t("operationSummary"),
      width: "36%",
      render: (item) => (
        <TruncatedCellText
          text={item.comment || summarizeLines(item.lines) || "—"}
          maxLength={70}
          tooltipLabel={t("supportShowFullText")}
        />
      ),
    },
    {
      key: "status",
      title: t("status"),
      filter: statusFilter,
      render: (item) => <StatusBadge status={item.status} />,
    },
    {
      key: "documents",
      title: t("billingDocuments"),
      render: (item) => (
        <OperationDocuments
          operationId={item.id}
          type={type}
          snapshots={item.snapshots}
          labels={{
            quote: t("openQuote"),
            invoice: t("openInvoice"),
            missingQuote: t("missingQuote"),
            missingInvoice: t("missingInvoice"),
          }}
        />
      ),
    },
    {
      key: "actions",
      title: t("usersActions"),
      render: (item) => (
        <OperationEmailButton
          operationId={item.id}
          clientEmail={item.client.email}
          snapshots={item.snapshots}
          language={i18n.language}
        />
      ),
    },
  ];
}
