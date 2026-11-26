import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatDateTime } from "@/shared/lib/date";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { FilterMenu, FilterMenuItem } from "@/shared/ui/FilterMenu";
import { Grid } from "@/shared/ui/Grid";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { TruncatedCellText } from "@/shared/ui/TruncatedCellText";
import { SupportNotificationCell } from "./SupportNotificationCell";
import type {
  SupportRequestDTO,
  SupportRequestStatus,
  SupportRequestType,
} from "./types";

const requestTypes: SupportRequestType[] = ["SR", "INC", "BUG"];
const requestStatuses: SupportRequestStatus[] = [
  "created",
  "pending",
  "closed",
];
const REQUEST_TEXT_LENGTHS = { description: 70 } as const;

export function SupportGrid({
  requests,
  loading,
  typeFilter,
  statusFilter,
  onTypeFilterChange,
  onStatusFilterChange,
  onCreate,
  onResendNotification,
  resendingRequestId,
  page,
  pageSize,
  hasNextPage,
  onPageChange,
  onPageSizeChange,
  onClearFilters,
}: Readonly<{
  requests: readonly SupportRequestDTO[];
  loading: boolean;
  typeFilter: SupportRequestType | undefined;
  statusFilter: SupportRequestStatus | undefined;
  onTypeFilterChange: (type: SupportRequestType | undefined) => void;
  onStatusFilterChange: (status: SupportRequestStatus | undefined) => void;
  onCreate: () => void;
  onResendNotification: (request: SupportRequestDTO) => void;
  resendingRequestId: number | null;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onClearFilters: () => void;
}>) {
  const { t, i18n } = useTranslation();
  const renderFilter = (kind: "type" | "status") => {
    const selected =
      kind === "type" ? (typeFilter ?? "") : (statusFilter ?? "");
    const options =
      kind === "type"
        ? [
            { value: "", label: t("supportFilterAll") },
            ...requestTypes.map((type) => ({
              value: type,
              label: t(`supportType_${type}`),
            })),
          ]
        : [
            { value: "", label: t("supportFilterAll") },
            ...requestStatuses.map((status) => ({
              value: status,
              label: t(`status_${status}`),
            })),
          ];
    const select = (value: string) => {
      if (kind === "type")
        onTypeFilterChange(requestTypes.find((type) => type === value));
      else
        onStatusFilterChange(
          requestStatuses.find((status) => status === value),
        );
    };

    return (
      <FilterMenu
        label={t(kind === "type" ? "supportFilterType" : "supportFilterStatus")}
        active={selected !== ""}
      >
        {(close) =>
          options.map((option) => (
            <FilterMenuItem
              key={option.value || "all"}
              checked={selected === option.value}
              onSelect={() => {
                select(option.value);
                close();
              }}
            >
              {option.label}
            </FilterMenuItem>
          ))
        }
      </FilterMenu>
    );
  };

  const activeFilters = [
    ...(typeFilter
      ? [
          {
            key: "type",
            label: [t("supportType"), t(`supportType_${typeFilter}`)].join(
              ": ",
            ),
            removeLabel: t("supportRemoveTypeFilter"),
            onRemove: () => onTypeFilterChange(undefined),
          },
        ]
      : []),
    ...(statusFilter
      ? [
          {
            key: "status",
            label: [t("supportStatus"), t(`status_${statusFilter}`)].join(": "),
            removeLabel: t("supportRemoveStatusFilter"),
            onRemove: () => onStatusFilterChange(undefined),
          },
        ]
      : []),
  ];

  return (
    <Grid
      title={t("supportGridTitle")}
      subtitle={t("supportGridSubtitle")}
      actions={[
        <Button key="create-support-request" type="button" onClick={onCreate}>
          <Plus size="1.0625rem" aria-hidden="true" />
          {t("supportNewRequest")}
        </Button>,
      ]}
      activeFilters={activeFilters}
      activeFiltersLabel={t("activeFilters")}
      activeFiltersEmptyMessage={t("noActiveFilters")}
      clearFiltersLabel={t("clearFilters")}
      onClearFilters={onClearFilters}
      columns={[
        {
          key: "reference",
          title: t("supportReference"),
          width: "14.5rem",
          filter: renderFilter("type"),
          render: (request) => (
            <Badge variant="secondary">{request.reference}</Badge>
          ),
        },
        {
          key: "title",
          title: t("supportRequestTitle"),
          // Keep 40% of the space left by the 44.5rem of fixed columns.
          width: "max(6.3rem, calc(40cqw - 17.8rem))",
          render: (request) => (
            <TruncatedCellText
              className="min-w-0 [&>span]:max-w-full [&>span:first-child]:line-clamp-2 [&>span:first-child]:[overflow-wrap:anywhere]"
              text={request.title}
              maxLength={38}
              displayLength={35}
              ellipsis="..."
              tooltipLabel={t("supportShowFullText")}
            />
          ),
        },
        {
          key: "description",
          title: t("supportDescription"),
          render: (request) => (
            <TruncatedCellText
              className="min-w-0 [&>span]:max-w-full [&>span:first-child]:line-clamp-2 [&>span:first-child]:[overflow-wrap:anywhere]"
              text={request.description}
              maxLength={REQUEST_TEXT_LENGTHS.description}
              tooltipLabel={t("supportShowFullText")}
            />
          ),
        },
        {
          key: "status",
          title: t("supportStatus"),
          width: "8.5rem",
          filter: renderFilter("status"),
          render: (request) => <StatusBadge status={request.status} />,
        },
        {
          key: "createdAt",
          title: (
            <span className="block text-center">{t("supportCreatedAt")}</span>
          ),
          width: "11.5rem",
          render: (request) => (
            <time
              className="block text-center whitespace-nowrap"
              dateTime={request.createdAt}
            >
              {formatDateTime(
                new Date(request.createdAt).getTime(),
                i18n.language,
              )}
            </time>
          ),
        },
        {
          key: "notification",
          title: t("supportNotification"),
          width: "10rem",
          render: (request) => (
            <SupportNotificationCell
              request={request}
              resending={resendingRequestId === request.id}
              onResend={onResendNotification}
            />
          ),
        },
      ]}
      rows={requests}
      getRowKey={(request) => request.id}
      busy={loading}
      fixedColumnLayout
      emptyMessage={loading ? undefined : t("supportEmpty")}
      pagination={{
        page,
        pageSize,
        hasNextPage,
        onPageChange,
        onPageSizeChange,
      }}
    />
  );
}
