import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { type Key, type ReactNode, useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "./button";
import { Input } from "./input";

interface GridPagination {
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

function GridPaginationFooter({
  page,
  pageSize,
  hasNextPage,
  onPageChange,
  onPageSizeChange,
  busy,
}: GridPagination & { busy: boolean }) {
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
        className="flex items-center gap-2 text-sm text-muted max-[35rem]:justify-between"
        htmlFor={inputId}
      >
        <span>{t("gridItemsPerPage")}</span>
        <Input
          id={inputId}
          className="h-9 w-16 text-center"
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
          <ChevronLeft size={18} aria-hidden="true" />
        </Button>
        <span className="min-w-[4.5rem] text-center text-sm text-muted">
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
          <ChevronRight size={18} aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}

export interface GridColumn<T> {
  key: string;
  title: ReactNode;
  filter?: ReactNode;
  width?: string;
  render: (row: T) => ReactNode;
}

interface ActiveFilter {
  key: string;
  label: string;
  removeLabel: string;
  onRemove: () => void;
}

interface GridProps<T> {
  title: string;
  subtitle: string;
  headerContent?: ReactNode;
  actions?: ReactNode[];
  columns: GridColumn<T>[];
  activeFilters?: ActiveFilter[];
  activeFiltersLabel?: string;
  activeFiltersEmptyMessage?: string;
  clearFiltersLabel?: string;
  onClearFilters?: () => void;
  rows: T[];
  getRowKey: (row: T) => Key;
  pagination: GridPagination;
  emptyMessage?: string;
  busy?: boolean;
  onRowClick?: (row: T) => void;
  fixedColumnLayout?: boolean;
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
    <section
      className="mx-auto rounded-md border border-border bg-surface"
      aria-busy={busy}
    >
      <header className="flex items-center gap-4 border-b border-border p-4 max-[35rem]:items-stretch max-[35rem]:flex-col">
        <div className="min-w-0">
          <h2 className="m-0 text-base font-bold text-foreground">{title}</h2>
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
          className="m-0 flex min-h-16 min-w-0 flex-wrap items-center gap-2 border-0 border-b border-border px-4 py-1"
          aria-label={activeFiltersLabel}
        >
          <span className="text-sm font-semibold text-muted">
            {activeFiltersLabel}
          </span>
          {activeFilters.map((filter) => (
            <button
              className="inline-flex min-h-8 items-center gap-1 rounded-full border border-border bg-surface-muted px-3 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-surface-muted/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              key={filter.key}
              type="button"
              aria-label={filter.removeLabel}
              onClick={filter.onRemove}
            >
              {filter.label}
              <X className="size-3.5" aria-hidden="true" />
            </button>
          ))}
          {activeFilters.length === 0 && activeFiltersEmptyMessage && (
            <span className="text-sm text-muted">
              {activeFiltersEmptyMessage}
            </span>
          )}
          {activeFilters.length > 0 && onClearFilters && clearFiltersLabel && (
            <Button
              className="ml-auto"
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
            >
              {clearFiltersLabel}
            </Button>
          )}
        </fieldset>
      )}
      <section className="overflow-x-auto" aria-label={title}>
        <table
          className={`w-full min-w-[58rem] border-collapse text-left text-sm text-foreground [&_td:first-child]:pl-4 [&_td:last-child]:pr-2 [&_th:first-child]:pl-4 [&_th:last-child]:pr-2 ${fixedColumnLayout ? "table-fixed" : ""}`}
        >
          <thead>
            <tr className="border-b border-border text-muted">
              {columns.map((column) => (
                <th
                  className="p-3 last:w-[10rem] last:whitespace-nowrap"
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
