import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { type Key, type ReactNode, useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "./Button";
import { Input } from "./Input";
import { Tag } from "./Tag";

interface GridPagination {
  readonly page: number;
  readonly pageSize: number;
  readonly hasNextPage: boolean;
  readonly onPageChange: (page: number) => void;
  readonly onPageSizeChange: (pageSize: number) => void;
}

function GridPaginationFooter({
  page,
  pageSize,
  hasNextPage,
  onPageChange,
  onPageSizeChange,
  busy,
}: Readonly<GridPagination & { busy: boolean }>) {
  const { t } = useTranslation();
  const inputId = useId();
  const [pageSizeInput, setPageSizeInput] = useState(String(pageSize));

  useEffect(() => {
    setPageSizeInput(String(pageSize));
  }, [pageSize]);

  const commitPageSize = () => {
    const parsed = Number(pageSizeInput.trim());
    const nextPageSize =
      pageSizeInput.trim() !== "" &&
      Number.isInteger(parsed) &&
      parsed >= 1 &&
      parsed <= 50
        ? parsed
        : 10;
    setPageSizeInput(String(nextPageSize));
    onPageSizeChange(nextPageSize);
  };

  return (
    <nav
      className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-3 max-[35rem]:flex-col max-[35rem]:items-stretch"
      aria-label={t("gridPagination")}
    >
      <label
        className="flex items-center gap-2 text-base text-muted max-[35rem]:justify-between"
        htmlFor={inputId}
      >
        <span>{t("gridItemsPerPage")}</span>
        <Input
          id={inputId}
          className="h-9 w-16 text-center"
          containerClassName="w-16 shrink-0"
          type="text"
          inputMode="numeric"
          value={pageSizeInput}
          onChange={(event) => setPageSizeInput(event.target.value)}
          onBlur={commitPageSize}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
        />
      </label>
      <div className="flex items-center justify-center gap-2 max-[35rem]:self-center">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label={t("previousPage")}
          disabled={page <= 1 || busy}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft size="1.125rem" aria-hidden="true" />
        </Button>
        <span className="min-w-[4.5rem] text-center text-base text-muted">
          {t("catalogPage", { page })}
        </span>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label={t("nextPage")}
          disabled={!hasNextPage || busy}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight size="1.125rem" aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}

export interface GridColumn<T> {
  readonly key: string;
  readonly title: ReactNode;
  readonly filter?: ReactNode;
  readonly width?: string;
  readonly render: (row: T) => ReactNode;
}

interface ActiveFilter {
  readonly key: string;
  readonly label: string;
  readonly removeLabel: string;
  readonly onRemove: () => void;
}

interface GridProps<T> {
  readonly title: string;
  readonly subtitle: string;
  readonly headerContent?: ReactNode;
  readonly actions?: readonly ReactNode[];
  readonly columns: readonly GridColumn<T>[];
  readonly activeFilters?: readonly ActiveFilter[];
  readonly activeFiltersLabel?: string;
  readonly activeFiltersEmptyMessage?: string;
  readonly clearFiltersLabel?: string;
  readonly onClearFilters?: () => void;
  readonly rows: readonly T[];
  readonly getRowKey: (row: T) => Key;
  readonly pagination: GridPagination;
  readonly emptyMessage?: string;
  readonly busy?: boolean;
  readonly onRowClick?: (row: T) => void;
  readonly fixedColumnLayout?: boolean;
}

export function Grid<T>({
  title,
  subtitle,
  headerContent,
  actions = [],
  columns,
  activeFilters = [],
  activeFiltersLabel,
  activeFiltersEmptyMessage,
  clearFiltersLabel,
  onClearFilters,
  rows,
  getRowKey,
  pagination,
  emptyMessage,
  busy = false,
  onRowClick,
  fixedColumnLayout = false,
}: GridProps<T>) {
  return (
    <section className="oz-card mx-auto overflow-hidden" aria-busy={busy}>
      <header className="flex items-center gap-4 border-b border-border p-4 max-[35rem]:items-stretch max-[35rem]:flex-col">
        <div className="min-w-0">
          <h2 className="oz-card-title m-0 text-foreground">{title}</h2>
          <p className="mt-1 mb-0 text-sm text-muted">{subtitle}</p>
        </div>
        {headerContent && <div className="min-w-0 flex-1">{headerContent}</div>}
        {actions.length > 0 && (
          <div className="ml-auto flex shrink-0 flex-wrap items-center gap-2 max-[35rem]:ml-0 max-[35rem]:w-full [&_[data-slot=button]]:max-[35rem]:w-full">
            {actions}
          </div>
        )}
      </header>
      {(activeFilters.length > 0 || activeFiltersEmptyMessage) && (
        <fieldset
          className="m-0 flex min-w-0 items-center gap-4 border-0 border-b border-border px-4 py-4 max-[35rem]:flex-col max-[35rem]:items-stretch"
          aria-label={activeFiltersLabel}
        >
          <div className="oz-filter-bar flex min-h-12 min-w-0 flex-1 items-center overflow-hidden rounded-[var(--oz-figma-tokens-sizes-radius-xs)] border border-control-border bg-surface">
            <span className="shrink-0 px-4 text-base text-muted">
              {activeFiltersLabel}
            </span>
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 py-1">
              {activeFilters.map((filter) => (
                <Tag
                  key={filter.key}
                  label={filter.label}
                  removeLabel={filter.removeLabel}
                  onRemove={filter.onRemove}
                />
              ))}
              {activeFilters.length === 0 && activeFiltersEmptyMessage && (
                <span className="text-base text-muted">
                  {activeFiltersEmptyMessage}
                </span>
              )}
            </div>
            {activeFilters.length > 0 &&
              onClearFilters &&
              clearFiltersLabel && (
                <button
                  className="grid h-12 w-12 shrink-0 place-items-center border-l border-control-border text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-[-0.125rem] focus-visible:outline-focus"
                  type="button"
                  aria-label={clearFiltersLabel}
                  title={clearFiltersLabel}
                  onClick={onClearFilters}
                >
                  <X className="size-5" aria-hidden="true" />
                </button>
              )}
          </div>
        </fieldset>
      )}
      <section className="@container overflow-x-auto" aria-label={title}>
        <table
          className={`w-full min-w-[58rem] border-collapse text-left text-base leading-[1.3] text-foreground [&_td:first-child]:pl-4 [&_td:last-child]:pr-2 [&_th:first-child]:pl-4 [&_th:last-child]:pr-2 ${fixedColumnLayout ? "table-fixed" : ""}`}
        >
          <thead>
            <tr className="border-b border-border text-muted">
              {columns.map((column) => (
                <th
                  className="p-3 font-medium last:w-[10rem] last:whitespace-nowrap"
                  key={column.key}
                  scope="col"
                  style={column.width ? { width: column.width } : undefined}
                >
                  {column.filter ? (
                    <div className="flex items-center gap-2">
                      <span>{column.title}</span>
                      {column.filter}
                    </div>
                  ) : (
                    column.title
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length > 0
              ? rows.map((row) => (
                  <tr
                    className={`border-b border-border last:border-0 ${onRowClick ? "cursor-pointer hover:bg-surface-muted focus-within:bg-surface-muted" : ""}`}
                    key={getRowKey(row)}
                    onClick={(event) => {
                      if (
                        event.target instanceof Element &&
                        event.target.closest(
                          "a, button, input, select, textarea",
                        )
                      ) {
                        return;
                      }
                      onRowClick?.(row);
                    }}
                  >
                    {columns.map((column) => (
                      <td
                        className="p-3 last:w-[10rem] last:whitespace-nowrap"
                        key={column.key}
                        style={
                          column.width ? { width: column.width } : undefined
                        }
                      >
                        {column.render(row)}
                      </td>
                    ))}
                  </tr>
                ))
              : emptyMessage && (
                  <tr>
                    <td
                      className="p-6 text-center text-sm text-muted"
                      colSpan={columns.length}
                    >
                      {emptyMessage}
                    </td>
                  </tr>
                )}
          </tbody>
        </table>
      </section>
      <GridPaginationFooter {...pagination} busy={busy} />
    </section>
  );
}
