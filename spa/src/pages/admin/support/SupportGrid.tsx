import { Funnel, Info, Plus } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Grid } from "../../../components/ui/Grid";
import { formatDateTime } from "../../../lib/date";
import type {
  SupportRequestDTO,
  SupportRequestStatus,
  SupportRequestType,
} from "../../../services/types";

const requestTypes: SupportRequestType[] = ["SR", "INC", "BUG"];
const NOTIFICATION_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const STALE_ATTEMPT_MS = 5 * 60 * 1000;
const REQUEST_TEXT_LENGTHS = { description: 70 } as const;

function TruncatedCellText({
  text,
  maxLength,
  displayLength = maxLength - 1,
  ellipsis = "…",
  tooltipLabel,
}: {
  text: string;
  maxLength: number;
  displayLength?: number;
  ellipsis?: string;
  tooltipLabel: string;
}) {
  const displaySource = text.normalize("NFC").replace(/\s+/g, " ").trim();
  const characters = Array.from(displaySource);
  const isTruncated = characters.length > maxLength;
  const displayText = isTruncated
    ? `${characters.slice(0, displayLength).join("")}${ellipsis}`
    : displaySource;

  return (
    <span className="grid justify-items-start gap-1">
      <span>{displayText}</span>
      {isTruncated && (
        <span
          className="inline-flex items-center gap-1 text-xs font-normal text-muted underline decoration-dotted underline-offset-2 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          role="note"
          aria-label={`${tooltipLabel}: ${displaySource}`}
          title={displaySource}
        >
          <Info className="size-3.5" aria-hidden="true" />
          {tooltipLabel}
        </span>
      )}
    </span>
  );
}

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
}: {
  requests: SupportRequestDTO[];
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
}) {
  const { t, i18n } = useTranslation();
  const [openFilter, setOpenFilter] = useState<"type" | "status" | null>(null);
  const filterRefs = useRef<{
    type: HTMLDivElement | null;
    status: HTMLDivElement | null;
  }>({ type: null, status: null });
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  useEffect(() => {
    if (!openFilter) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (
        !Object.values(filterRefs.current).some((filter) =>
          filter?.contains(target),
        ) &&
        !menuRef.current?.contains(target)
      ) {
        setOpenFilter(null);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenFilter(null);
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [openFilter]);

  useLayoutEffect(() => {
    if (!openFilter) {
      setMenuPosition(null);
      return;
    }

    const updatePosition = () => {
      const filter = filterRefs.current[openFilter];
      if (!filter) return;

      const bounds = filter.getBoundingClientRect();
      const menuWidth = 190;
      setMenuPosition({
        top: bounds.bottom + 8,
        left: Math.max(
          8,
          Math.min(bounds.left, window.innerWidth - menuWidth - 8),
        ),
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [openFilter]);

  const renderFilter = (kind: "type" | "status") => {
    const active =
      kind === "type" ? typeFilter !== undefined : statusFilter !== undefined;
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
            { value: "created", label: t("status_created") },
            { value: "pending", label: t("status_pending") },
            { value: "closed", label: t("status_closed") },
          ];
    const label = t(
      kind === "type" ? "supportFilterType" : "supportFilterStatus",
    );

    return (
      <div
        className="relative flex w-fit items-center gap-2"
        ref={(element) => {
          filterRefs.current[kind] = element;
        }}
      >
        <button
          className={`relative grid size-8 place-items-center rounded-[0.3125rem] text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${openFilter === kind ? "bg-surface-muted" : ""}`}
          type="button"
          aria-label={label}
          aria-expanded={openFilter === kind}
          aria-haspopup="menu"
          onClick={() =>
            setOpenFilter((current) => (current === kind ? null : kind))
          }
        >
          <Funnel
            className={`size-4 ${active ? "fill-current" : ""}`}
            aria-hidden="true"
          />
          {active && (
            <span className="absolute top-0.5 right-0.5 size-2 rounded-full bg-primary ring-2 ring-surface" />
          )}
        </button>
        {openFilter === kind &&
          menuPosition &&
          createPortal(
            <div
              className="fixed z-[100] grid min-w-[11.875rem] gap-1 rounded-md border border-border bg-surface p-1.5 text-foreground shadow-lg"
              ref={menuRef}
              role="menu"
              aria-label={label}
              style={{ top: menuPosition.top, left: menuPosition.left }}
            >
              {options.map((option) => (
                <button
                  className="flex min-h-10 items-center gap-2 rounded px-2 text-left text-sm hover:bg-surface-muted"
                  key={option.value || "all"}
                  type="button"
                  role="menuitemradio"
                  aria-checked={selected === option.value}
                  onClick={() => {
                    if (kind === "type") {
                      onTypeFilterChange(
                        requestTypes.find((type) => type === option.value),
                      );
                    } else {
                      onStatusFilterChange(
                        option.value === "created" || option.value === "pending"
                          ? option.value
                          : undefined,
                      );
                    }
                    setOpenFilter(null);
                  }}
                >
                  {selected === option.value ? (
                    <Funnel className="size-4 shrink-0" aria-hidden="true" />
                  ) : (
                    <span className="size-4 shrink-0" />
                  )}
                  {option.label}
                </button>
              ))}
            </div>,
            document.body,
          )}
      </div>
    );
  };

  const canResendNotification = (request: SupportRequestDTO) => {
    if (request.status === "closed") return false;
    return (
      request.discordNotificationStatus === "pending" ||
      request.discordNotificationStatus === "failed" ||
      (request.discordNotificationStatus === "sending" &&
        request.discordNotificationAttemptAt !== null &&
        Date.now() >=
          new Date(request.discordNotificationAttemptAt).getTime() +
            STALE_ATTEMPT_MS) ||
      (request.discordNotificationStatus === "sent" &&
        request.discordNotifiedAt !== null &&
        Date.now() >=
          new Date(request.discordNotifiedAt).getTime() +
            NOTIFICATION_COOLDOWN_MS)
    );
  };

  const activeFilters = [
    ...(typeFilter
      ? [
          {
            key: "type",
            label: `${t("supportType")}: ${t(`supportType_${typeFilter}`)}`,
            removeLabel: t("supportRemoveTypeFilter"),
            onRemove: () => onTypeFilterChange(undefined),
          },
        ]
      : []),
    ...(statusFilter
      ? [
          {
            key: "status",
            label: `${t("supportStatus")}: ${t(`status_${statusFilter}`)}`,
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
          <Plus size={17} aria-hidden="true" />
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
          width: "13%",
          filter: renderFilter("type"),
          render: (request) => (
            <Badge variant="secondary">{request.reference}</Badge>
          ),
        },
        {
          key: "title",
          title: t("supportRequestTitle"),
          width: "20%",
          render: (request) => (
            <TruncatedCellText
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
          width: "36%",
          render: (request) => (
            <TruncatedCellText
              text={request.description}
              maxLength={REQUEST_TEXT_LENGTHS.description}
              tooltipLabel={t("supportShowFullText")}
            />
          ),
        },
        {
          key: "status",
          title: t("supportStatus"),
          width: "10%",
          filter: renderFilter("status"),
          render: (request) => (
            <Badge variant="secondary">{t(`status_${request.status}`)}</Badge>
          ),
        },
        {
          key: "createdAt",
          title: t("supportCreatedAt"),
          width: "13%",
          render: (request) =>
            formatDateTime(
              new Date(request.createdAt).getTime(),
              i18n.language,
            ),
        },
        {
          key: "notification",
          title: t("supportNotification"),
          width: "8%",
          render: (request) => {
            const canResend = canResendNotification(request);
            const isSending =
              (request.discordNotificationStatus === "sending" && !canResend) ||
              resendingRequestId === request.id;

            return (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!canResend || isSending}
                title={
                  request.status === "closed"
                    ? t("supportClosedNoResend")
                    : undefined
                }
                onClick={() => onResendNotification(request)}
              >
                {isSending
                  ? t("supportNotificationSending")
                  : t("supportNotificationResend")}
              </Button>
            );
          },
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
