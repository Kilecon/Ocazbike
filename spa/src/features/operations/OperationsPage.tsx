import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { ClientSearchInput } from "@/features/clients/ClientSearchInput";
import { Button } from "@/shared/ui/Button";
import { Grid } from "@/shared/ui/Grid";
import { PageHeader, PageShell } from "@/shared/ui/PageShell";
import { useErrorToast } from "@/shared/ui/useErrorToast";
import { CreateOperationForm } from "./create/CreateOperationForm";
import { useCreateOperation } from "./create/useCreateOperation";
import { OperationDetailModal } from "./detail/OperationDetailModal";
import { useOperationColumns } from "./OperationColumns";
import {
  type OperationFilterState,
  OperationFilters,
  type OperationTab,
} from "./OperationFilters";
import { OperationStatusTabs } from "./OperationTabs";
import { operationsQuery } from "./queries";
import { OPERATION_TITLE_KEYS } from "./sections";
import type {
  BillingDocumentStatus,
  BillingDocumentType,
  BillingOperationListItemDTO,
} from "./types";

const DEFAULT_OPERATIONS_PAGE_SIZE = 10;

function ClientOperationsShell({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return <section className="min-w-0">{children}</section>;
}

function OperationsPageShell({
  clientId,
  labelledBy,
  children,
}: Readonly<{
  clientId?: number;
  labelledBy: string;
  children: ReactNode;
}>) {
  if (clientId)
    return <ClientOperationsShell>{children}</ClientOperationsShell>;
  return <PageShell labelledBy={labelledBy}>{children}</PageShell>;
}

function OperationPanel({
  clientId,
  id,
  labelledBy,
  children,
}: Readonly<{
  clientId?: number;
  id: string;
  labelledBy: string;
  children: ReactNode;
}>) {
  if (clientId) return <>{children}</>;
  return (
    <div role="tabpanel" id={id} aria-labelledby={labelledBy}>
      {children}
    </div>
  );
}

const DEFAULT_FILTERS: OperationFilterState = {
  tab: "all",
  statuses: [],
  search: "",
};

export function OperationsPage({
  type,
  clientId,
  filters = DEFAULT_FILTERS,
  onFiltersChange,
  selectedOperationId,
  onSelectOperation,
}: Readonly<{
  type: BillingDocumentType;
  clientId?: number;
  filters?: OperationFilterState;
  onFiltersChange?: (filters: OperationFilterState) => void;
  selectedOperationId: number | null;
  onSelectOperation: (operationId: number | null) => void;
}>) {
  const { t, i18n } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const [pageSize, setPageSize] = useState(DEFAULT_OPERATIONS_PAGE_SIZE);
  const tabsId = useId();
  const panelId = `${tabsId}-panel`;
  // The page resets to 1 whenever the filters change, including from the URL.
  const filtersKey = `${filters.tab}|${filters.statuses.join(",")}|${filters.search}`;
  const [pageState, setPageState] = useState({ filtersKey, page: 1 });
  const listPage = pageState.filtersKey === filtersKey ? pageState.page : 1;
  const setListPage = (page: number) => setPageState({ filtersKey, page });
  const [searchInput, setSearchInput] = useState(filters.search);
  const changeFilters = useCallback(
    (tab: OperationTab, statuses: BillingDocumentStatus[], search: string) =>
      onFiltersChange?.({ tab, statuses, search }),
    [onFiltersChange],
  );

  useEffect(() => {
    setSearchInput((current) =>
      current.trim() === filters.search ? current : filters.search,
    );
  }, [filters.search]);

  useEffect(() => {
    if (searchInput.trim() === filters.search) return;
    const timer = window.setTimeout(
      () => changeFilters(filters.tab, filters.statuses, searchInput.trim()),
      350,
    );
    return () => window.clearTimeout(timer);
  }, [
    changeFilters,
    filters.search,
    filters.statuses,
    filters.tab,
    searchInput,
  ]);
  const operationsPage = useQuery(
    operationsQuery({
      type,
      clientId,
      page: listPage,
      limit: pageSize,
      statuses: clientId ? undefined : filters.statuses,
      search: clientId ? undefined : filters.search,
    }),
  );
  useErrorToast(operationsPage.error, t("operationsLoadError"));
  const operations = operationsPage.data?.operations ?? [];
  const totalOperations = operationsPage.data?.total ?? 0;
  const loading = operationsPage.isFetching;
  const { saving, create } = useCreateOperation(type, () => {
    setShowForm(false);
    setListPage(1);
  });
  const columns = useOperationColumns({
    type,
    statusFilter:
      clientId || filters.tab !== "all" ? undefined : (
        <OperationFilters
          statuses={filters.statuses}
          onStatusesChange={(statuses) =>
            changeFilters("all", statuses, filters.search)
          }
        />
      ),
  });
  const title = t(OPERATION_TITLE_KEYS[type]);
  return (
    <OperationsPageShell clientId={clientId} labelledBy="operations-title">
      {!clientId && (
        <PageHeader
          titleId="operations-title"
          kicker={t("adminWorkspace")}
          title={title}
          intro={t("operationsIntro", { type: title.toLowerCase() })}
        />
      )}

      {showForm && (
        <CreateOperationForm
          type={type}
          saving={saving}
          onCancel={() => setShowForm(false)}
          onSubmit={create}
        />
      )}

      {!clientId && (
        <OperationStatusTabs
          key={type}
          selected={filters.tab}
          id={tabsId}
          panelId={panelId}
          type={type}
          onSelect={(tab) =>
            changeFilters(tab, tab === "all" ? [] : [tab], filters.search)
          }
        />
      )}
      <OperationPanel
        clientId={clientId}
        id={panelId}
        labelledBy={`${tabsId}-${filters.tab}`}
      >
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
          activeFiltersEmptyMessage={
            clientId ? undefined : t("noActiveFilters")
          }
          activeFilters={
            clientId
              ? []
              : [
                  ...(filters.tab === "all" ? filters.statuses : []).map(
                    (status) => ({
                      key: status,
                      label: t(`status_${status}`),
                      removeLabel: t("operationRemoveFilter", {
                        filter: t(`status_${status}`),
                      }),
                      onRemove: () =>
                        changeFilters(
                          filters.tab,
                          filters.statuses.filter((value) => value !== status),
                          filters.search,
                        ),
                    }),
                  ),
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
                            changeFilters(filters.tab, filters.statuses, "");
                          },
                        },
                      ]
                    : []),
                ]
          }
          clearFiltersLabel={t("operationClearFilters")}
          onClearFilters={() => {
            setSearchInput("");
            changeFilters(
              filters.tab,
              filters.tab === "all" ? [] : [filters.tab],
              "",
            );
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
                    <Plus size="1.0625rem" aria-hidden="true" />
                    {t("newOperation")}
                  </Button>,
                ]
          }
          columns={columns}
          rows={operations}
          getRowKey={(item) => item.id}
          onRowClick={(item) => onSelectOperation(item.id)}
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
      </OperationPanel>
      {selectedOperationId !== null ? (
        <OperationDetailModal
          key={selectedOperationId}
          operationId={selectedOperationId}
          title={title}
          language={i18n.language}
          onClose={() => onSelectOperation(null)}
        />
      ) : null}
    </OperationsPageShell>
  );
}
