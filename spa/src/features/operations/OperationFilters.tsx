import { useTranslation } from "react-i18next";
import { FilterMenu, FilterMenuItem } from "@/shared/ui/FilterMenu";
import type { BillingDocumentStatus } from "./types";

export const OPERATION_FILTER_STATUSES: BillingDocumentStatus[] = [
  "pending",
  "in_progress",
  "payment_pending",
  "paid",
  "cancelled",
  "completed",
];
export const OPERATION_TAB_STATUSES = [
  "pending",
  "in_progress",
  "payment_pending",
] as const;
export type OperationTab = "all" | (typeof OPERATION_TAB_STATUSES)[number];

/** Operation filters as they appear in the URL search params. */
export interface OperationSearch {
  status?: string;
  tab?: string;
  search?: string;
}

export interface OperationFilterState {
  tab: OperationTab;
  statuses: BillingDocumentStatus[];
  search: string;
}

export function operationFiltersFromSearch({
  status,
  tab,
  search,
}: OperationSearch): OperationFilterState {
  const statuses = status
    ? OPERATION_FILTER_STATUSES.filter((value) =>
        status.split(",").includes(value),
      )
    : [];
  const matchingTab = OPERATION_TAB_STATUSES.find(
    (value) => statuses.length === 1 && statuses[0] === value,
  );
  return {
    tab: tab === "all" ? "all" : (matchingTab ?? "all"),
    statuses,
    search: search ?? "",
  };
}

export function operationFiltersToSearch({
  tab,
  statuses,
  search,
}: OperationFilterState): OperationSearch {
  return {
    status: statuses.length ? statuses.join(",") : "all",
    tab: tab === "all" ? "all" : undefined,
    search: search || undefined,
  };
}

export function OperationFilters({
  statuses,
  onStatusesChange,
}: Readonly<{
  statuses: BillingDocumentStatus[];
  onStatusesChange: (statuses: BillingDocumentStatus[]) => void;
}>) {
  const { t } = useTranslation();
  const selectedStatusLabels = statuses
    .map((status) => t(`status_${status}`))
    .join(", ");
  const filterLabel =
    statuses.length > 0
      ? `${t("usersFilter")}: ${selectedStatusLabels}`
      : `${t("usersFilter")}: ${t("operationFilterAll")}`;
  return (
    <FilterMenu
      label={filterLabel}
      menuLabel={t("usersFilter")}
      active={statuses.length > 0}
    >
      {() => (
        <OperationStatusOptions
          statuses={statuses}
          onStatusesChange={onStatusesChange}
        />
      )}
    </FilterMenu>
  );
}

/** Multi-select status options; "All" clears the selection. */
export function OperationStatusOptions({
  statuses,
  onStatusesChange,
}: Readonly<{
  statuses: BillingDocumentStatus[];
  onStatusesChange: (statuses: BillingDocumentStatus[]) => void;
}>) {
  const { t } = useTranslation();
  return [null, ...OPERATION_FILTER_STATUSES].map((status) => {
    const selected =
      status === null ? statuses.length === 0 : statuses.includes(status);
    const updateStatuses = () => {
      if (status === null) onStatusesChange([]);
      else if (selected)
        onStatusesChange(statuses.filter((value) => value !== status));
      else onStatusesChange([...statuses, status]);
    };
    return (
      <FilterMenuItem
        key={status ?? "all"}
        multiple
        checked={selected}
        onSelect={updateStatuses}
      >
        {status === null ? t("operationFilterAll") : t(`status_${status}`)}
      </FilterMenuItem>
    );
  });
}
