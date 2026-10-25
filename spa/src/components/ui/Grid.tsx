import { X } from "lucide-react";
import type { Key, ReactNode } from "react";
import { Button } from "./button";

export interface GridColumn<T> {
  key: string;
  title: ReactNode;
  filter?: ReactNode;
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
  actions?: ReactNode[];
  columns: GridColumn<T>[];
  activeFilters?: ActiveFilter[];
  activeFiltersLabel?: string;
  clearFiltersLabel?: string;
  onClearFilters?: () => void;
  rows: T[];
  getRowKey: (row: T) => Key;
  footer?: ReactNode;
  emptyMessage?: string;
  busy?: boolean;
}

export function Grid<T>({
  title,
  subtitle,
  actions = [],
  columns,
  activeFilters = [],
  activeFiltersLabel,
  clearFiltersLabel,
  onClearFilters,
  rows,
  getRowKey,
  footer,
  emptyMessage,
  busy = false,
}: GridProps<T>) {
  return (
    <section
      className="mx-auto rounded-md border border-border bg-surface"
      aria-busy={busy}
    >
      <header className="flex items-center justify-between gap-4 border-b border-border p-4 max-[35rem]:items-start max-[35rem]:flex-col">
        <div>
          <h2 className="m-0 text-base font-bold text-foreground">{title}</h2>
          <p className="mt-1 mb-0 text-sm text-muted">{subtitle}</p>
        </div>
        {actions.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        )}
      </header>
      {activeFilters.length > 0 && (
        <fieldset
          className="m-0 flex min-w-0 flex-wrap items-center gap-2 border-0 border-b border-border px-4 py-3"
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
          {onClearFilters && clearFiltersLabel && (
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
        <table className="w-full min-w-[58rem] border-collapse text-left text-sm text-foreground [&_td:first-child]:pl-4 [&_td:last-child]:pr-2 [&_th:first-child]:pl-4 [&_th:last-child]:pr-2">
          <thead>
            <tr className="border-b border-border text-muted">
              {columns.map((column) => (
                <th className="p-3" key={column.key} scope="col">
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
                    className="border-b border-border last:border-0"
                    key={getRowKey(row)}
                  >
                    {columns.map((column) => (
                      <td className="p-3" key={column.key}>
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
      {footer}
    </section>
  );
}
