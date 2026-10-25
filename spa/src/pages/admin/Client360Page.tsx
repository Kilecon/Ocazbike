import {
  ArrowDownAZ,
  ArrowUpAZ,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAdminToast } from "../../components/admin/AdminToast";
import { StatusBadge } from "../../components/admin/StatusBadge";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { AdminLayout } from "../../layouts/AdminLayout";
import { getClientsPage } from "../../services/clients.api";
import type { BillingDocumentType, ClientPageDTO } from "../../services/types";

const pageSize = 20;
type OperationFilter = "all" | BillingDocumentType;

export function Client360Page() {
  const { t } = useTranslation();
  const { showErrorToast } = useAdminToast();
  const [result, setResult] = useState<ClientPageDTO | null>(null);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<"name_asc" | "name_desc">("name_asc");
  const [operation, setOperation] = useState<OperationFilter>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const loadClients = useCallback(async () => {
    setLoading(true);
    try {
      setResult(
        await getClientsPage({ page, pageSize, sort, operation, search }),
      );
    } catch (loadError) {
      showErrorToast(loadError, t("client360LoadError"));
    } finally {
      setLoading(false);
    }
  }, [operation, page, search, showErrorToast, sort, t]);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  const changeOperation = (next: OperationFilter) => {
    setOperation(next);
    setPage(1);
  };

  const changeSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const pages = result ? Math.max(1, Math.ceil(result.total / pageSize)) : 1;

  return (
    <AdminLayout>
      <main
        className="min-h-screen min-w-0 flex-1 p-[clamp(1.5rem,4vw,3.5rem)] max-[45rem]:min-h-0 max-[45rem]:px-4 max-[45rem]:pt-6 max-[45rem]:pb-10 [&_*:focus-visible]:outline-[0.1875rem] [&_*:focus-visible]:outline-offset-[0.1875rem] [&_*:focus-visible]:outline-[var(--oz-focus)]"
        aria-labelledby="client360-title"
      >
        <header className="mx-auto mb-6 flex max-w-[77.5rem] items-start justify-between gap-6 max-[35rem]:grid max-[35rem]:gap-4">
          <div>
            <span className="text-[0.72rem] font-bold text-muted">
              {t("adminView360")}
            </span>
            <h1
              className="mt-1 mb-0 font-[var(--font-display)] text-2xl leading-[1.2] font-bold text-foreground max-[35rem]:text-[1.6rem]"
              id="client360-title"
            >
              {t("client360Title")}
            </h1>
            <p className="mt-0 max-w-[38.75rem] mb-0 leading-6 text-muted">
              {t("client360Intro")}
            </p>
          </div>
        </header>

        <section
          className="mx-auto mb-[1.125rem] max-w-[77.5rem] rounded-md border border-border bg-surface p-5 max-[35rem]:p-[0.9375rem]"
          aria-label={t("client360Controls")}
        >
          <div className="mb-[1.375rem] flex flex-wrap items-center justify-start gap-3">
            <label
              className="grid min-w-[11.875rem] flex-1 gap-1.5 text-sm font-semibold text-foreground"
              htmlFor="client360-search"
            >
              {t("searchClient")}
              <Input
                id="client360-search"
                type="search"
                value={search}
                onChange={(event) => changeSearch(event.target.value)}
                placeholder={t("clientSearchPlaceholder")}
              />
            </label>
            <label
              className="grid min-w-[11.875rem] gap-1.5 text-sm font-semibold text-foreground"
              htmlFor="client360-operation-filter"
            >
              {t("operationFilter")}
              <select
                id="client360-operation-filter"
                className="min-h-11 rounded-[0.3125rem] border border-control-border bg-surface px-[0.6875rem] py-[0.5625rem] text-foreground"
                value={operation}
                onChange={(event) =>
                  changeOperation(event.target.value as OperationFilter)
                }
              >
                <option value="all">{t("allOperations")}</option>
                <option value="repair">{t("repairs")}</option>
                <option value="purchase">{t("purchases")}</option>
                <option value="sale">{t("sales")}</option>
              </select>
            </label>
            <Button
              variant="outline"
              type="button"
              onClick={() =>
                setSort((current) =>
                  current === "name_asc" ? "name_desc" : "name_asc",
                )
              }
              aria-label={
                sort === "name_asc" ? t("sortNameDesc") : t("sortNameAsc")
              }
            >
              {sort === "name_asc" ? (
                <ArrowDownAZ size={16} aria-hidden="true" />
              ) : (
                <ArrowUpAZ size={16} aria-hidden="true" />
              )}
              {sort === "name_asc" ? t("sortNameAsc") : t("sortNameDesc")}
            </Button>
          </div>

          <div className="mb-[0.875rem] flex items-center justify-between gap-3">
            <h2 className="m-0 text-[1.05rem] text-foreground">
              {t("clientRecords")}
            </h2>
            {result && (
              <Badge variant="secondary">
                {t("clientCount", { count: result.total })}
              </Badge>
            )}
          </div>
          {loading ? (
            <p className="text-[0.8rem] text-muted" role="status">
              {t("loading")}
            </p>
          ) : result?.clients.length ? (
            <div className="w-full overflow-x-auto">
              <table className="w-full border-collapse text-left [&_th]:whitespace-nowrap [&_th]:border-b [&_th]:border-border [&_th]:px-3 [&_th]:py-[0.6875rem] [&_th]:text-[0.72rem] [&_th]:font-bold [&_th]:text-muted [&_td]:min-w-[8.125rem] [&_td]:border-b [&_td]:border-border [&_td]:px-3 [&_td]:py-[0.8125rem] [&_td]:align-top [&_td]:text-[0.85rem] [&_td]:text-foreground [&_td:first-child]:min-w-[13.125rem] [&_td:first-child_strong]:block [&_td:first-child_span]:mt-1 [&_td:first-child_span]:block [&_td:first-child_span]:text-[0.76rem] [&_td:first-child_span]:text-muted [&_tbody_tr:last-child_td]:border-b-0">
                <thead>
                  <tr>
                    <th>{t("client")}</th>
                    <th>{t("repairs")}</th>
                    <th>{t("purchases")}</th>
                    <th>{t("sales")}</th>
                  </tr>
                </thead>
                <tbody>
                  {result.clients.map((client) => (
                    <tr key={client.id}>
                      <td>
                        <strong>
                          {client.firstname} {client.lastname}
                        </strong>
                        <span>{client.email}</span>
                        <span>{client.phonenumber}</span>
                      </td>
                      {(["repair", "purchase", "sale"] as const).map((type) => {
                        const operations = client.operations.filter(
                          (item) => item.type === type,
                        );
                        return (
                          <td key={type}>
                            <div className="grid justify-items-start gap-[0.4375rem]">
                              {operations.length ? (
                                operations.map((item) => (
                                  <div
                                    className="grid justify-items-start gap-0.5"
                                    key={item.id}
                                  >
                                    <StatusBadge status={item.status} />
                                    <time
                                      className="text-[0.76rem] text-muted"
                                      dateTime={item.date}
                                    >
                                      {item.date}
                                    </time>
                                  </div>
                                ))
                              ) : (
                                <span className="text-muted">—</span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-[0.8rem] text-muted">{t("noClientsFound")}</p>
          )}

          <footer className="mt-4 flex items-center justify-between gap-3 text-[0.82rem] text-muted max-[45rem]:items-start max-[45rem]:flex-col max-[35rem]:[&>div]:w-full max-[35rem]:[&_[data-slot=button]]:flex-1">
            <span>
              {result ? t("pageOf", { page: result.page, pages }) : ""}
            </span>
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="outline"
                size="sm"
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                <ChevronLeft size={16} aria-hidden="true" /> {t("previousPage")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                type="button"
                disabled={page >= pages || loading}
                onClick={() =>
                  setPage((current) => Math.min(pages, current + 1))
                }
              >
                {t("nextPage")} <ChevronRight size={16} aria-hidden="true" />
              </Button>
            </div>
          </footer>
        </section>
      </main>
    </AdminLayout>
  );
}
