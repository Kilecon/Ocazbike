import { ArrowRight, Plus, X } from "lucide-react";
import {
  type ReactNode,
  type SubmitEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { useAdminToast } from "../../../components/admin/AdminToast";
import { StatusBadge } from "../../../components/admin/StatusBadge";
import { Button } from "../../../components/ui/button";
import { ClientSearchInput } from "../../../components/ui/ClientSearchInput";
import { Grid } from "../../../components/ui/Grid";
import { Input } from "../../../components/ui/input";
import { TruncatedCellText } from "../../../components/ui/TruncatedCellText";
import { formatLocalDate } from "../../../lib/date";
import { getClientsPage } from "../../../services/clients.api";
import {
  acceptQuote,
  type BillingLineInput,
  completeOperation,
  createOperation,
  getOperation,
  getOperations,
  payOperation,
  rejectQuote,
} from "../../../services/operations.api";
import type {
  BillingDocumentStatus,
  BillingDocumentType,
  BillingOperationDTO,
  BillingOperationListItemDTO,
  BillingPaymentMethod,
  ClientListItemDTO,
} from "../../../services/types";
import { AdminPageShell } from "../common/AdminPageShell";
import { InvoicePayment } from "./InvoicePayment";
import { OperationDocuments } from "./OperationDocuments";
import {
  OperationFilters,
  operationFiltersFromQuery,
} from "./OperationFilters";
import { RepairDates } from "./RepairDates";

interface OperationLineForm {
  id: number;
  description: string;
  quantity: string;
  unitPrice: string;
  vatRate: string;
  isDiscount?: boolean;
}

type OperationTitleKey =
  | "adminRepairs"
  | "adminBuybacks"
  | "adminSales"
  | "adminRentals";
type OperationActionLabel =
  | "acceptQuote"
  | "rejectQuote"
  | "completeOperation"
  | "createInvoice";
type OperationSuccessMessage =
  | "quoteAccepted"
  | "quoteRejected"
  | "operationCompleted"
  | "invoiceCreated"
  | "operationPaid";
type OperationTransitionButton = {
  label: OperationActionLabel;
  action: () => Promise<BillingOperationDTO>;
  success: OperationSuccessMessage;
};
type PaymentMethodLabel =
  | "payment_card"
  | "payment_cheque"
  | "payment_bank_transfer"
  | "payment_cash"
  | "payment_free";
const DEFAULT_OPERATIONS_PAGE_SIZE = 10;

function localDate(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function isoDate(value: string, endOfDay = false): string | undefined {
  if (!value) return undefined;
  return `${value}T${endOfDay ? "23:59:59" : "00:00:00"}Z`;
}

function operationTitleKey(type: BillingDocumentType): OperationTitleKey {
  switch (type) {
    case "repair":
      return "adminRepairs";
    case "purchase":
      return "adminBuybacks";
    case "sale":
      return "adminSales";
    case "rental":
      return "adminRentals";
  }
}

function amountForLine(
  line: Pick<
    OperationLineForm,
    "quantity" | "unitPrice" | "vatRate" | "isDiscount"
  >,
): string {
  const quantity = Number(line.quantity);
  const unitPrice = Number(line.unitPrice);
  const vatRate = Number(line.vatRate);
  if (
    !Number.isFinite(quantity) ||
    !Number.isFinite(unitPrice) ||
    !Number.isFinite(vatRate)
  ) {
    return "";
  }
  return (
    quantity *
    unitPrice *
    (1 + vatRate / 100) *
    (line.isDiscount ? -1 : 1)
  ).toFixed(2);
}

function formatAmount(value: string): string {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "EUR",
      }).format(amount)
    : value;
}

function ClientOperationsShell({
  children,
}: {
  labelledBy: string;
  children: ReactNode;
}) {
  return <section className="min-w-0">{children}</section>;
}

export function OperationsPage({
  type,
  clientId,
}: {
  type: BillingDocumentType;
  clientId?: number;
}) {
  const { t, i18n } = useTranslation();
  const { showToast, showErrorToast } = useAdminToast();
  const [operations, setOperations] = useState<BillingOperationListItemDTO[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [listPage, setListPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_OPERATIONS_PAGE_SIZE);
  const [totalOperations, setTotalOperations] = useState(0);
  const path = window.location.pathname.replace(/\/+$/, "");
  const [filters, setFilters] = useState(() =>
    clientId
      ? { statuses: [], search: "" }
      : operationFiltersFromQuery(window.location.search),
  );
  const [searchInput, setSearchInput] = useState(filters.search);
  const loadGeneration = useRef(0);
  const changeFilters = useCallback(
    (statuses: BillingDocumentStatus[], search: string) => {
      setFilters({ statuses, search });
      setListPage(1);
      const params = new URLSearchParams(window.location.search);
      params.set("status", statuses.length ? statuses.join(",") : "all");
      if (search) params.set("search", search);
      else params.delete("search");
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}?${params}`,
      );
    },
    [],
  );

  useEffect(() => {
    if (searchInput.trim() === filters.search) return;
    const timer = window.setTimeout(
      () => changeFilters(filters.statuses, searchInput.trim()),
      350,
    );
    return () => window.clearTimeout(timer);
  }, [changeFilters, filters.search, filters.statuses, searchInput]);
  const detailMatch = path.match(/^\/admin\/[^/]+\/(\d+)$/);
  const operationId = !clientId && detailMatch ? Number(detailMatch[1]) : null;
  const [selectedOperationId, setSelectedOperationId] = useState<number | null>(
    operationId,
  );

  const load = useCallback(async () => {
    const generation = ++loadGeneration.current;
    setLoading(true);
    try {
      const page = await getOperations({
        type,
        clientId,
        page: listPage,
        limit: pageSize,
        statuses: clientId ? undefined : filters.statuses,
        search: clientId ? undefined : filters.search,
      });
      if (generation !== loadGeneration.current) return;
      setOperations(page.operations);
      setTotalOperations(page.total);
    } catch (loadError) {
      if (generation === loadGeneration.current)
        showErrorToast(loadError, t("operationsLoadError"));
    } finally {
      if (generation === loadGeneration.current) setLoading(false);
    }
  }, [clientId, filters, listPage, pageSize, showErrorToast, t, type]);

  useEffect(() => {
    void load();
    return () => {
      loadGeneration.current += 1;
    };
  }, [load]);

  const submitNewOperation = async (input: {
    clientId: number;
    createQuote?: boolean;
    date: string;
    serviceStartAt?: string;
    serviceEndAt?: string;
    comment: string;
    lines: BillingLineInput[];
  }) => {
    setSaving(true);
    try {
      const created = await createOperation({ ...input, type });
      setShowForm(false);
      setListPage(1);
      showToast(
        "success",
        t("toastSuccess"),
        t(
          input.createQuote && created.status === "in_progress"
            ? "zeroQuoteAccepted"
            : input.createQuote
              ? "operationCreatedWithQuote"
              : type === "repair"
                ? "repairStarted"
                : "operationCreated",
        ),
      );
      if (listPage === 1) await load();
    } catch (saveError) {
      showErrorToast(saveError, t("operationCreateError"));
    } finally {
      setSaving(false);
    }
  };

  const title = t(operationTitleKey(type));
  const PageShell = clientId ? ClientOperationsShell : AdminPageShell;

  return (
    <PageShell labelledBy="operations-title">
      {!clientId && (
        <header className="mx-auto mb-6">
          <div>
            <span className="text-[0.72rem] font-bold text-muted">
              {t("adminWorkspace")}
            </span>
            <h1
              className="mt-1 mb-0 font-[var(--font-display)] text-2xl leading-[1.2] font-bold text-foreground"
              id="operations-title"
            >
              {title}
            </h1>
            <p className="mt-1 mb-0 max-w-[38.75rem] leading-6 text-muted">
              {t("operationsIntro", { type: title.toLowerCase() })}
            </p>
          </div>
        </header>
      )}

      {showForm && (
        <CreateOperationForm
          type={type}
          saving={saving}
          onCancel={() => setShowForm(false)}
          onSubmit={submitNewOperation}
        />
      )}

      <Grid<BillingOperationListItemDTO>
        title={title}
        headerContent={
          clientId ? undefined : (
            <ClientSearchInput
              id="operation-client-search"
              value={searchInput}
              onChange={setSearchInput}
            />
          )
        }
        activeFiltersLabel={t("operationActiveFilters")}
        activeFiltersEmptyMessage={clientId ? undefined : t("supportFilterAll")}
        activeFilters={
          clientId
            ? []
            : [
                ...filters.statuses.map((status) => ({
                  key: status,
                  label: t(`status_${status}`),
                  removeLabel: t("operationRemoveFilter", {
                    filter: t(`status_${status}`),
                  }),
                  onRemove: () =>
                    changeFilters(
                      filters.statuses.filter((value) => value !== status),
                      filters.search,
                    ),
                })),
                ...(filters.search
                  ? [
                      {
                        key: "client",
                        label: `${t("client")}: ${filters.search}`,
                        removeLabel: t("operationRemoveFilter", {
                          filter: filters.search,
                        }),
                        onRemove: () => {
                          setSearchInput("");
                          changeFilters(filters.statuses, "");
                        },
                      },
                    ]
                  : []),
              ]
        }
        clearFiltersLabel={t("operationClearFilters")}
        onClearFilters={() => {
          setSearchInput("");
          changeFilters([], "");
        }}
        subtitle={t("operationsGridSubtitle", { count: totalOperations })}
        actions={
          clientId
            ? []
            : [
                <Button
                  key="new-operation"
                  type="button"
                  onClick={() => setShowForm(true)}
                >
                  <Plus size={17} aria-hidden="true" />
                  {t("newOperation")}
                </Button>,
              ]
        }
        columns={[
          {
            key: "client",
            title: t("client"),
            render: (item) => (
              <div className="grid gap-1">
                <span className="font-semibold text-foreground">
                  {item.client.firstname} {item.client.lastname}
                </span>
                <span className="text-xs text-muted">
                  {item.client.email || "—"}
                </span>
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
                text={item.comment || "—"}
                maxLength={70}
                tooltipLabel={t("supportShowFullText")}
              />
            ),
          },
          {
            key: "status",
            title: t("status"),
            filter: clientId ? undefined : (
              <OperationFilters
                statuses={filters.statuses}
                onStatusesChange={(statuses) =>
                  changeFilters(statuses, filters.search)
                }
              />
            ),
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
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setSelectedOperationId(item.id)}
              >
                {t("viewOperation")}
                <ArrowRight size={15} aria-hidden="true" />
              </Button>
            ),
          },
        ]}
        rows={operations}
        getRowKey={(item) => item.id}
        onRowClick={(item) => setSelectedOperationId(item.id)}
        busy={loading}
        emptyMessage={loading ? t("loading") : t("noOperations")}
        pagination={{
          page: listPage,
          pageSize,
          hasNextPage: listPage * pageSize < totalOperations,
          onPageChange: setListPage,
          onPageSizeChange: (nextPageSize) => {
            setPageSize(nextPageSize);
            setListPage(1);
          },
        }}
      />
      {selectedOperationId !== null ? (
        <OperationDetailModal
          key={selectedOperationId}
          operationId={selectedOperationId}
          title={title}
          language={i18n.language}
          onClose={() => {
            setSelectedOperationId(null);
            if (operationId && !clientId)
              window.history.replaceState(
                null,
                "",
                `/admin/${path.split("/")[2]}${window.location.search}`,
              );
          }}
          onChanged={load}
        />
      ) : null}
    </PageShell>
  );
}

function OperationDetailModal({
  operationId,
  title,
  language,
  onClose,
  onChanged,
}: {
  operationId: number;
  title: string;
  language: string;
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const { showToast, showErrorToast } = useAdminToast();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [operation, setOperation] = useState<BillingOperationDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [request, setRequest] = useState({ id: operationId });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void getOperation(request.id)
      .then((result) => {
        if (active) setOperation(result);
      })
      .catch((error: unknown) => {
        if (active) showErrorToast(error, t("operationsLoadError"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [request, showErrorToast, t]);

  async function runAction(
    action: () => Promise<BillingOperationDTO>,
    message: OperationSuccessMessage,
  ) {
    setSaving(true);
    try {
      setOperation(await action());
      showToast("success", t("toastSuccess"), t(message));
      await onChanged();
    } catch (error: unknown) {
      showErrorToast(error, t("operationUpdateError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-label={title}
      className="m-auto max-h-[90dvh] w-[min(70rem,95vw)] overflow-y-auto rounded-xl border border-border bg-surface p-5 text-foreground shadow-xl backdrop:bg-black/50"
      onCancel={(event) => {
        if (saving) event.preventDefault();
      }}
      onClose={onClose}
    >
      <OperationDetail
        operation={operation}
        loading={loading}
        saving={saving}
        title={title}
        language={language}
        onBack={() => {
          if (!saving) onClose();
        }}
        onAction={runAction}
        onReload={async () => {
          setRequest({ id: operationId });
        }}
      />
      {loading || !operation ? (
        <div className="mt-5 flex justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={onClose}
          >
            <X size={18} aria-hidden="true" />
            {t("closeRepair")}
          </Button>
        </div>
      ) : null}
    </dialog>
  );
}

export function CreateOperationForm({
  type,
  saving,
  onCancel,
  onSubmit,
}: {
  type: BillingDocumentType;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (input: {
    clientId: number;
    createQuote?: boolean;
    date: string;
    serviceStartAt?: string;
    serviceEndAt?: string;
    comment: string;
    lines: BillingLineInput[];
  }) => Promise<void>;
}) {
  const { t } = useTranslation();
  const { showErrorToast } = useAdminToast();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [clientResults, setClientResults] = useState<ClientListItemDTO[]>([]);
  const [selectedClient, setSelectedClient] =
    useState<ClientListItemDTO | null>(null);
  const [date, setDate] = useState(localDate(new Date()));
  const [serviceStartAt, setServiceStartAt] = useState("");
  const [serviceEndAt, setServiceEndAt] = useState("");
  const [comment, setComment] = useState("");
  const [createQuote, setCreateQuote] = useState(true);
  const [lines, setLines] = useState<OperationLineForm[]>([
    { id: 1, description: "", quantity: "1", unitPrice: "", vatRate: "20" },
  ]);
  const nextLineId = useRef(2);
  const requiresServicePeriod = type === "rental";
  const total = useMemo(
    () =>
      lines.reduce(
        (sum, line) => sum + Math.round(Number(amountForLine(line) || 0) * 100),
        0,
      ) / 100,
    [lines],
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  useEffect(() => {
    const search = clientSearch.trim();
    setClientResults([]);
    if (selectedClient || search.length < 3) return;

    let active = true;
    const timer = window.setTimeout(() => {
      void getClientsPage({ page: 1, limit: 5, search })
        .then((result) => {
          if (active) setClientResults(result.clients.slice(0, 5));
        })
        .catch((error: unknown) => {
          if (active) showErrorToast(error, t("operationsLoadError"));
        });
    }, 350);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [clientSearch, selectedClient, showErrorToast, t]);

  const updateLine = <K extends keyof OperationLineForm>(
    index: number,
    key: K,
    value: OperationLineForm[K],
  ) => {
    setLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index ? { ...line, [key]: value } : line,
      ),
    );
  };

  const submit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedClient) return;
    const formattedLines = lines.map(({ id: _id, isDiscount, ...line }) => ({
      ...line,
      unitPrice: isDiscount ? `-${line.unitPrice}` : line.unitPrice,
      total: amountForLine({ ...line, isDiscount }),
    }));
    await onSubmit({
      clientId: selectedClient.id,
      createQuote,
      date: `${date}T12:00:00Z`,
      serviceStartAt: isoDate(serviceStartAt),
      serviceEndAt: isoDate(serviceEndAt, true),
      comment,
      lines: formattedLines,
    });
  };

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[min(77.5rem,calc(100vw-2rem))] max-w-none overflow-y-auto rounded-md border border-border bg-surface p-0 text-foreground shadow-xl backdrop:bg-black/50"
      aria-labelledby="create-operation-dialog-title"
      onClose={onCancel}
    >
      <form
        className="grid gap-4 p-5 [&>label]:grid [&>label]:gap-1.5 [&>label]:text-sm [&>label]:font-semibold [&>label]:text-foreground"
        onSubmit={(event) => void submit(event)}
      >
        <header className="flex items-start justify-between gap-4">
          <h2
            className="m-0 text-lg font-bold text-foreground"
            id="create-operation-dialog-title"
          >
            {t("newOperation")} · {t(operationTitleKey(type))}
          </h2>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={t("modalClose")}
            onClick={onCancel}
          >
            <X size={18} aria-hidden="true" />
          </Button>
        </header>
        <label htmlFor="operation-client">
          {t("client")}
          <Input
            id="operation-client"
            value={clientSearch}
            onChange={(event) => {
              setClientSearch(event.target.value);
              setSelectedClient(null);
            }}
            placeholder={t("clientSearchPlaceholder")}
            maxLength={50}
            autoComplete="off"
            required
          />
        </label>
        {clientResults.length > 0 && !selectedClient && (
          <div
            className="grid max-h-52 overflow-auto rounded border border-border"
            role="listbox"
            aria-label={t("clientSearchResults")}
          >
            {clientResults.map((client) => (
              <button
                className="border-0 border-b border-border bg-surface px-3 py-2 text-left text-foreground hover:bg-surface-muted"
                key={client.id}
                type="button"
                role="option"
                aria-selected="false"
                onClick={() => {
                  setSelectedClient(client);
                  setClientSearch(`${client.firstname} ${client.lastname}`);
                }}
              >
                {client.firstname} {client.lastname} · {client.email}
              </button>
            ))}
          </div>
        )}
        {selectedClient && (
          <p className="m-0 text-sm text-primary" role="status">
            {t("selectedClient")}
          </p>
        )}
        <div className="grid gap-3 md:grid-cols-2">
          <label htmlFor="operation-date">
            {t("date")}
            <Input
              id="operation-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              required
            />
          </label>
          <label htmlFor="operation-service-start">
            {t("serviceStartDate")}
            <Input
              id="operation-service-start"
              type="date"
              value={serviceStartAt}
              onChange={(event) => setServiceStartAt(event.target.value)}
              required={requiresServicePeriod}
            />
          </label>
          <label htmlFor="operation-service-end">
            {t("serviceEndDate")}
            <Input
              id="operation-service-end"
              type="date"
              value={serviceEndAt}
              onChange={(event) => setServiceEndAt(event.target.value)}
              required={requiresServicePeriod}
            />
          </label>
        </div>
        <section className="grid gap-3" aria-label={t("billingLines")}>
          <div className="flex items-center justify-between gap-3">
            <h3 className="m-0 text-base font-semibold text-foreground">
              {t("billingLines")}
            </h3>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setLines((current) => [
                  ...current,
                  {
                    id: nextLineId.current++,
                    description: "",
                    quantity: "1",
                    unitPrice: "",
                    vatRate: "20",
                  },
                ])
              }
            >
              <Plus size={16} aria-hidden="true" />
              {t("addBillingLine")}
            </Button>
          </div>
          {lines.map((line, index) => (
            <div
              className="grid items-end gap-3 rounded border border-border p-3 md:grid-cols-[minmax(12rem,2fr)_0.7fr_0.8fr_0.7fr_0.9fr_auto]"
              key={line.id}
            >
              <label
                className="flex items-center gap-2 text-sm text-foreground md:col-span-full"
                htmlFor={`operation-line-discount-${line.id}`}
              >
                <input
                  id={`operation-line-discount-${line.id}`}
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={line.isDiscount ?? false}
                  onChange={(event) =>
                    updateLine(index, "isDiscount", event.target.checked)
                  }
                />
                {t("discountLine")}
              </label>
              <label
                className="grid gap-1 text-sm text-foreground"
                htmlFor={`operation-line-description-${line.id}`}
              >
                {t("description")}
                <Input
                  id={`operation-line-description-${line.id}`}
                  value={line.description}
                  onChange={(event) =>
                    updateLine(index, "description", event.target.value)
                  }
                  required
                />
              </label>
              <label
                className="grid gap-1 text-sm text-foreground"
                htmlFor={`operation-line-quantity-${line.id}`}
              >
                {t("quantity")}
                <Input
                  id={`operation-line-quantity-${line.id}`}
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={line.quantity}
                  onChange={(event) =>
                    updateLine(index, "quantity", event.target.value)
                  }
                  required
                />
              </label>
              <label
                className="grid gap-1 text-sm text-foreground"
                htmlFor={`operation-line-price-${line.id}`}
              >
                {t("unitPrice")}
                <Input
                  id={`operation-line-price-${line.id}`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.unitPrice}
                  onChange={(event) =>
                    updateLine(index, "unitPrice", event.target.value)
                  }
                  required
                />
              </label>
              <label
                className="grid gap-1 text-sm text-foreground"
                htmlFor={`operation-line-vat-${line.id}`}
              >
                {t("vatRate")}
                <Input
                  id={`operation-line-vat-${line.id}`}
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={line.vatRate}
                  onChange={(event) =>
                    updateLine(index, "vatRate", event.target.value)
                  }
                  required
                />
              </label>
              <span className="pb-3 text-sm text-muted">
                {formatAmount(amountForLine(line))}
              </span>
              {lines.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  aria-label={t("removeBillingLine")}
                  onClick={() =>
                    setLines((current) =>
                      current.filter((_, lineIndex) => lineIndex !== index),
                    )
                  }
                >
                  <X size={16} aria-hidden="true" />
                </Button>
              )}
            </div>
          ))}
          <p className="m-0 text-right font-semibold text-foreground">
            {t("estimatedTotal")}: {formatAmount(total.toFixed(2))}
          </p>
          {total < 0 && (
            <p
              className="m-0 text-sm text-red-700 dark:text-red-300"
              role="alert"
            >
              {t("discountExceedsTotal")}
            </p>
          )}
        </section>
        <div>
          <label
            className="flex items-center gap-2 text-sm font-semibold text-foreground"
            htmlFor="operation-create-quote"
          >
            <input
              id="operation-create-quote"
              type="checkbox"
              className="size-4 accent-primary"
              checked={createQuote}
              disabled={saving}
              onChange={(event) => setCreateQuote(event.target.checked)}
            />
            {t("createQuote")}
          </label>
        </div>
        <label htmlFor="operation-comment">
          {t("comment")}
          <textarea
            id="operation-comment"
            rows={6}
            className="min-h-36 w-full resize-y rounded-md border border-control-border bg-surface px-3 py-2 text-sm font-normal text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-70"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
          />
        </label>
        <div className="flex justify-end gap-3 max-[35rem]:flex-col">
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("cancel")}
          </Button>
          <Button
            type="submit"
            disabled={saving || !selectedClient || total < 0}
          >
            {saving
              ? t("saving")
              : t(
                  type === "repair"
                    ? "saveRepair"
                    : type === "sale"
                      ? "saveSale"
                      : type === "purchase"
                        ? "savePurchase"
                        : "saveRental",
                )}
          </Button>
        </div>
      </form>
    </dialog>
  );
}

export function OperationDetail({
  operation,
  loading,
  saving,
  title,
  language,
  onBack,
  onAction,
  onReload,
}: {
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
}) {
  const { t } = useTranslation();
  const [paymentMethod, setPaymentMethod] =
    useState<BillingPaymentMethod>("card");

  if (loading) {
    return (
      <p className="text-sm text-muted" role="status">
        {t("loading")}
      </p>
    );
  }
  if (!operation) {
    return (
      <section className="mx-auto max-w-[77.5rem] rounded-md border border-border bg-surface p-5">
        <p className="text-muted">{t("operationNotFound")}</p>
      </section>
    );
  }

  const paymentOptions: Array<[BillingPaymentMethod, PaymentMethodLabel]> = [
    ["card", "payment_card"],
    ["cheque", "payment_cheque"],
    ["bank_transfer", "payment_bank_transfer"],
    ["cash", "payment_cash"],
  ];
  const invoice = operation.snapshots.find(({ kind }) => kind === "invoice");
  const transitionButtons: OperationTransitionButton[] = (() => {
    if (operation.status === "pending") {
      return [
        {
          label: "acceptQuote",
          action: () => acceptQuote(operation.id),
          success: "quoteAccepted",
        },
        {
          label: "rejectQuote",
          action: () => rejectQuote(operation.id),
          success: "quoteRejected",
        },
      ];
    }
    if (operation.status === "in_progress") {
      return [
        {
          label: "completeOperation",
          action: () => completeOperation(operation.id),
          success: "operationCompleted",
        },
      ];
    }
    if (operation.status === "completed" && !invoice) {
      return [
        {
          label: "createInvoice",
          action: () => completeOperation(operation.id),
          success: "invoiceCreated",
        },
      ];
    }
    return [];
  })();

  const showInvoiceActions =
    operation.status === "completed" || operation.status === "payment_pending";
  const zeroTotal =
    operation.lines.reduce(
      (sum, line) => sum + Math.round(Number(line.total) * 100),
      0,
    ) === 0;
  const formatDate = (timestamp: number | null) =>
    timestamp === null
      ? t("notSpecified")
      : formatLocalDate(timestamp, language);
  const rejectedQuote = operation.snapshots.find(
    ({ kind, status }) => kind === "quote" && status === "rejected",
  );
  const closedAt = rejectedQuote
    ? rejectedQuote.updatedAt
    : invoice?.status === "paid"
      ? (invoice.paidAt ?? null)
      : null;

  return (
    <div className="mx-auto grid max-w-[77.5rem] gap-5">
      <header className="grid gap-2">
        <div className="contents">
          <h1 className="mt-3 mb-2 font-[var(--font-display)] text-2xl font-bold text-foreground">
            {title} · {t("operationNumber", { id: operation.id })}
          </h1>
          <div className="flex items-center justify-between gap-4">
            <p className="m-0 min-w-0 text-muted">
              {operation.client.firstname} {operation.client.lastname} ·{" "}
              {formatDate(operation.date)}
            </p>
            <StatusBadge status={operation.status} />
          </div>
        </div>
      </header>

      <OperationDocuments
        operationId={operation.id}
        type={operation.type}
        snapshots={operation.snapshots}
        showLabels
        labels={{
          quote: t("openQuote"),
          invoice: t("openInvoice"),
          missingQuote: t("missingQuote"),
          missingInvoice: t("missingInvoice"),
        }}
      />

      <section className="grid gap-4 rounded-md border border-border bg-surface p-5 md:grid-cols-2">
        <div>
          <h2 className="m-0 mb-2 text-base font-semibold text-foreground">
            {t("client")}
          </h2>
          <p className="m-0 text-sm text-foreground">
            {operation.client.firstname} {operation.client.lastname}
          </p>
          <p className="m-0 text-sm text-muted">{operation.client.email}</p>
          <p className="m-0 text-sm text-muted">
            {operation.client.phonenumber}
          </p>
          {operation.client.address && (
            <p className="m-0 text-sm text-muted">
              {operation.client.address}
              {operation.client.addressComplement
                ? `, ${operation.client.addressComplement}`
                : ""}
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

      <section className="rounded-md border border-border bg-surface p-5">
        <h2 className="m-0 mb-3 text-base font-semibold text-foreground">
          {t("billingLines")}
        </h2>
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-left [&_th]:border-b [&_th]:border-border [&_th]:px-3 [&_th]:py-2 [&_th]:text-xs [&_th]:text-muted [&_td]:border-b [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_td]:text-sm [&_td]:text-foreground">
            <thead>
              <tr>
                <th>{t("description")}</th>
                <th>{t("quantity")}</th>
                <th>{t("unitPrice")}</th>
                <th>{t("vatRate")}</th>
                <th>{t("total")}</th>
              </tr>
            </thead>
            <tbody>
              {operation.lines.map((line) => (
                <tr key={line.id}>
                  <td>{line.description}</td>
                  <td>{line.quantity}</td>
                  <td>{formatAmount(line.unitPrice)}</td>
                  <td>{line.vatRate}%</td>
                  <td>{formatAmount(line.total)}</td>
                </tr>
              ))}
              {operation.lines.length === 0 && (
                <tr>
                  <td colSpan={5}>{t("noBillingLines")}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {operation.snapshots.length > 0 && (
        <section className="grid gap-3 rounded-md border border-border bg-surface p-5">
          <h2 className="m-0 text-base font-semibold text-foreground">
            {t("billingDocuments")}
          </h2>
          {operation.snapshots.map((snapshot) => (
            <article
              className="flex flex-wrap items-center justify-between gap-3 rounded border border-border p-3"
              key={snapshot.kind}
            >
              <div>
                <strong className="text-foreground">
                  {snapshot.kind === "quote"
                    ? t("quoteNumber", {
                        number: String(snapshot.payload.documentNumber ?? ""),
                      })
                    : t("invoiceNumber", {
                        number: String(snapshot.payload.documentNumber ?? ""),
                      })}
                </strong>
                <p className="m-0 text-sm text-muted">
                  <StatusBadge status={snapshot.status} />
                </p>
              </div>
              <span className="text-xs text-muted">
                {formatDate(snapshot.createdAt)}
              </span>
            </article>
          ))}
        </section>
      )}

      <section className="flex flex-wrap items-end justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={saving}
          onClick={onBack}
        >
          <X size={18} aria-hidden="true" />
          {t("closeRepair")}
        </Button>
        {showInvoiceActions && (
          <>
            {zeroTotal ? (
              <p className="m-0 text-sm text-muted">{t("zeroInvoicePaid")}</p>
            ) : (
              <>
                <label className="grid gap-1 text-sm text-foreground">
                  {t("paymentMethod")}
                  <select
                    className="min-h-11 rounded border border-control-border bg-surface px-3 text-foreground"
                    value={paymentMethod}
                    onChange={(event) => {
                      const selected = paymentOptions.find(
                        ([value]) => value === event.target.value,
                      )?.[0];
                      if (selected) setPaymentMethod(selected);
                    }}
                  >
                    {paymentOptions.map(([value, label]) => (
                      <option key={value} value={value}>
                        {t(label)}
                      </option>
                    ))}
                  </select>
                </label>
                <Button
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    void onAction(
                      () => payOperation(operation.id, paymentMethod),
                      "operationPaid",
                    )
                  }
                >
                  {t("markPaid")}
                </Button>
              </>
            )}
          </>
        )}
        {transitionButtons.map((button) => (
          <Button
            type="button"
            key={button.label}
            disabled={saving}
            onClick={() =>
              void onAction(button.action, button.success).then(onReload)
            }
          >
            {t(button.label)}
          </Button>
        ))}
      </section>
    </div>
  );
}
