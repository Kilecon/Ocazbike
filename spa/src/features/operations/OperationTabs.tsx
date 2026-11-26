import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { StatusTabs } from "@/shared/ui/StatusTabs";
import { useErrorToast } from "@/shared/ui/useErrorToast";
import { OPERATION_TAB_STATUSES, type OperationTab } from "./OperationFilters";
import { operationsQuery, useOperationCountsQuery } from "./queries";
import type { BillingDocumentType, BillingOperationCountsDTO } from "./types";

const tabs: OperationTab[] = ["all", ...OPERATION_TAB_STATUSES];

interface OperationTabsProps {
  selected: OperationTab;
  onSelect: (tab: OperationTab) => void;
  id: string;
  panelId: string;
}

export function OperationStatusTabs({
  selected,
  onSelect,
  id,
  panelId,
  type,
}: OperationTabsProps & {
  type: BillingDocumentType;
}) {
  const { t } = useTranslation();
  const counts = useOperationCountsQuery().data?.[type] ?? null;
  const totalQuery = useQuery({
    ...operationsQuery({ type, page: 1, limit: 1 }),
    refetchOnWindowFocus: true,
  });
  const total = totalQuery.isError ? null : (totalQuery.data?.total ?? null);
  useErrorToast(totalQuery.error, t("operationCountsLoadError"));

  return (
    <OperationTabs
      selected={selected}
      onSelect={onSelect}
      id={id}
      panelId={panelId}
      counts={counts}
      total={total}
    />
  );
}

export function OperationTabs({
  selected,
  onSelect,
  id,
  panelId,
  counts,
  total,
}: OperationTabsProps & {
  counts: BillingOperationCountsDTO[BillingDocumentType] | null;
  total: number | null;
}) {
  const { t } = useTranslation();
  return (
    <StatusTabs
      id={id}
      panelId={panelId}
      label={t("operationStatusTabs")}
      title={t("operationTabCountsHint")}
      selected={selected}
      onSelect={onSelect}
      tabs={tabs.map((tab) => ({
        value: tab,
        label: tab === "all" ? t("operationFilterAll") : t(`status_${tab}`),
        count: tab === "all" ? total : (counts?.[tab] ?? null),
      }))}
    />
  );
}
