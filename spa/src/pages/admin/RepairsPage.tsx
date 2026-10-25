import { Plus, X } from "lucide-react";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { useAdminToast } from "../../components/admin/AdminToast";
import { StatusBadge } from "../../components/admin/StatusBadge";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { AdminLayout } from "../../layouts/AdminLayout";
import { getClientsPage } from "../../services/clients.api";
import { createRepair, getActiveRepairs } from "../../services/repairs.api";
import type { BillingDocumentStatus, RepairDTO } from "../../services/types";

const statuses: BillingDocumentStatus[] = [
  "created",
  "pending",
  "in_progress",
  "completed",
  "paid",
];

function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function RepairsPage() {
  const { t } = useTranslation();
  const { showToast, showErrorToast } = useAdminToast();
  const [repairs, setRepairs] = useState<RepairDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [clientResults, setClientResults] = useState<
    Awaited<ReturnType<typeof getClientsPage>>["clients"]
  >([]);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [form, setForm] = useState({
    date: today(),
    status: "created" as BillingDocumentStatus,
    comment: "",
    description: "",
    unitPrice: "",
    vatRate: "20",
  });
  const total = useMemo(() => {
    const amount = Number(form.unitPrice);
    const vat = Number(form.vatRate);
    if (!Number.isFinite(amount) || !Number.isFinite(vat)) return "";
    return (amount * (1 + vat / 100)).toFixed(2);
  }, [form.unitPrice, form.vatRate]);

  const loadRepairs = useCallback(async () => {
    setLoading(true);
    try {
      setRepairs(await getActiveRepairs());
    } catch (loadError) {
      showErrorToast(loadError, t("repairsLoadError"));
    } finally {
      setLoading(false);
    }
  }, [showErrorToast, t]);

  useEffect(() => {
    void loadRepairs();
  }, [loadRepairs]);

  useEffect(() => {
    if (!showForm || clientSearch.trim().length < 2) {
      setClientResults([]);
      return;
    }

    let active = true;
    const timer = window.setTimeout(() => {
      void getClientsPage({
        page: 1,
        pageSize: 20,
        sort: "name_asc",
        operation: "all",
        search: clientSearch.trim(),
      })
        .then((result) => {
          if (active) setClientResults(result.clients);
        })
        .catch((searchError: unknown) => {
          if (active) {
            showErrorToast(searchError, t("repairsLoadError"));
          }
        });
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [clientSearch, showErrorToast, showForm, t]);

  const submitRepair = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedClientId || !total) return;
    setSaving(true);
    try {
      await createRepair({
        clientId: selectedClientId,
        ...form,
        quantity: "1",
        unitPrice: Number(form.unitPrice).toFixed(2),
        vatRate: Number(form.vatRate).toFixed(2),
        total,
      });
      setShowForm(false);
      setSelectedClientId(null);
      setClientSearch("");
      setForm({
        date: today(),
        status: "created",
        comment: "",
        description: "",
        unitPrice: "",
        vatRate: "20",
      });
      showToast("success", t("toastSuccess"), t("repairCreated"));
      await loadRepairs();
    } catch (saveError) {
      showErrorToast(saveError, t("repairCreateError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <main
        className="min-h-screen min-w-0 flex-1 p-[clamp(1.5rem,4vw,3.5rem)] max-[45rem]:min-h-0 max-[45rem]:px-4 max-[45rem]:pt-6 max-[45rem]:pb-10 [&_*:focus-visible]:outline-[0.1875rem] [&_*:focus-visible]:outline-offset-[0.1875rem] [&_*:focus-visible]:outline-[var(--oz-focus)]"
        aria-labelledby="repairs-title"
      >
        <header className="mx-auto mb-6 flex max-w-[77.5rem] items-start justify-between gap-6 max-[35rem]:grid max-[35rem]:gap-4 [&_h1]:mt-1 [&_h1]:mb-[0.375rem] [&_h1]:font-[var(--font-display)] [&_h1]:text-2xl [&_h1]:leading-[1.2] [&_h1]:font-bold [&_h1]:text-foreground max-[35rem]:[&_h1]:text-[1.6rem] [&_p]:m-0 [&_p]:max-w-[38.75rem] [&_p]:leading-6 [&_p]:text-muted">
          <div>
            <span className="text-[0.72rem] font-bold text-muted">
              {t("adminRepairs")}
            </span>
            <h1 id="repairs-title">{t("repairsTitle")}</h1>
            <p>{t("repairsIntro")}</p>
          </div>
          <Button
            type="button"
            onClick={() => setShowForm((visible) => !visible)}
          >
            {showForm ? (
              <X size={17} aria-hidden="true" />
            ) : (
              <Plus size={17} aria-hidden="true" />
            )}
            {showForm ? t("cancel") : t("newRepair")}
          </Button>
        </header>

        {showForm && (
          <form
            className="mx-auto mb-[1.125rem] grid max-w-[77.5rem] gap-3.5 rounded-md border border-border bg-surface p-5 max-[35rem]:p-[0.9375rem] [&>label]:grid [&>label]:gap-1.5 [&>label]:text-sm [&>label]:font-semibold [&>label]:text-foreground [&_select]:min-h-11 [&_select]:rounded-[0.3125rem] [&_select]:border [&_select]:border-control-border [&_select]:bg-surface [&_select]:px-[0.6875rem] [&_select]:py-[0.5625rem] [&_select]:text-foreground"
            onSubmit={submitRepair}
          >
            <h2 className="m-0 text-[1.05rem] text-foreground">
              {t("newRepair")}
            </h2>
            <label
              className="grid gap-1.5 text-sm font-semibold text-foreground"
              htmlFor="repair-client-search"
            >
              {t("client")}
              <Input
                id="repair-client-search"
                value={clientSearch}
                onChange={(event) => {
                  setClientSearch(event.target.value);
                  setSelectedClientId(null);
                }}
                placeholder={t("clientSearchPlaceholder")}
                autoComplete="off"
                required
              />
            </label>
            {clientSearch.trim().length >= 2 && !selectedClientId && (
              <div
                className="grid max-h-[13.75rem] overflow-auto rounded-[0.3125rem] border border-border"
                role="listbox"
                aria-label={t("clientSearchResults")}
              >
                {clientResults.map((client) => (
                  <button
                    className="grid gap-1 border-0 border-b border-border bg-surface px-3 py-2.5 text-left text-foreground hover:bg-surface-muted"
                    key={client.id}
                    type="button"
                    role="option"
                    aria-selected="false"
                    onClick={() => {
                      setSelectedClientId(client.id);
                      setClientSearch(`${client.firstname} ${client.lastname}`);
                    }}
                  >
                    <strong>
                      {client.firstname} {client.lastname}
                    </strong>
                    <span className="text-[0.8rem] text-muted">
                      {client.email} · {client.phonenumber}
                    </span>
                  </button>
                ))}
                {clientResults.length === 0 && (
                  <p className="m-0 p-3 text-[0.8rem] text-muted">
                    {t("noClientsFound")}
                  </p>
                )}
              </div>
            )}
            {selectedClientId && (
              <p className="m-0 text-[0.8rem] text-primary" role="status">
                {t("selectedClient")}
              </p>
            )}

            <div className="grid grid-cols-3 gap-3.5 max-[45rem]:grid-cols-2 max-[35rem]:grid-cols-1 [&>label]:grid [&>label]:gap-1.5 [&>label]:text-sm [&>label]:font-semibold [&>label]:text-foreground">
              <label htmlFor="repair-description">
                {t("repairDescription")}
                <Input
                  id="repair-description"
                  value={form.description}
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
                  }
                  minLength={1}
                  required
                />
              </label>
              <label htmlFor="repair-date">
                {t("date")}
                <Input
                  id="repair-date"
                  type="date"
                  value={form.date}
                  onChange={(event) =>
                    setForm({ ...form, date: event.target.value })
                  }
                  required
                />
              </label>
              <label htmlFor="repair-status">
                {t("status")}
                <select
                  className="min-h-11 rounded-[0.3125rem] border border-control-border bg-surface px-[0.6875rem] py-[0.5625rem] text-foreground"
                  id="repair-status"
                  value={form.status}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      status: event.target.value as BillingDocumentStatus,
                    })
                  }
                >
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {t(`status_${status}`)}
                    </option>
                  ))}
                </select>
              </label>
              <label htmlFor="repair-price">
                {t("unitPrice")}
                <Input
                  id="repair-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.unitPrice}
                  onChange={(event) =>
                    setForm({ ...form, unitPrice: event.target.value })
                  }
                  required
                />
              </label>
              <label htmlFor="repair-vat">
                {t("vatRate")}
                <Input
                  id="repair-vat"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={form.vatRate}
                  onChange={(event) =>
                    setForm({ ...form, vatRate: event.target.value })
                  }
                  required
                />
              </label>
              <label htmlFor="repair-total">
                {t("totalWithTax")}
                <Input id="repair-total" value={total} readOnly />
              </label>
              <label
                className="col-span-full max-[35rem]:col-auto"
                htmlFor="repair-comment"
              >
                {t("comment")}
                <Input
                  id="repair-comment"
                  value={form.comment}
                  onChange={(event) =>
                    setForm({ ...form, comment: event.target.value })
                  }
                />
              </label>
            </div>
            <div className="mt-1 flex items-center justify-end gap-3 max-[35rem]:items-stretch max-[35rem]:flex-col [&_[data-slot=button]]:max-[35rem]:w-full">
              <Button type="submit" disabled={saving || !selectedClientId}>
                {saving ? t("saving") : t("saveRepair")}
              </Button>
            </div>
          </form>
        )}

        <section
          className="mx-auto mb-[1.125rem] max-w-[77.5rem] rounded-md border border-border bg-surface p-5 max-[35rem]:p-[0.9375rem]"
          aria-labelledby="active-repairs-title"
        >
          <div className="mb-[0.875rem] flex items-center justify-between gap-3">
            <div>
              <h2
                className="m-0 text-[1.05rem] text-foreground"
                id="active-repairs-title"
              >
                {t("activeRepairs")}
              </h2>
              <p className="mt-1 mb-0 text-[0.82rem] text-muted">
                {t("activeRepairsDescription")}
              </p>
            </div>
            <Badge variant="secondary">{repairs.length}</Badge>
          </div>
          {loading ? (
            <p className="text-[0.8rem] text-muted" role="status">
              {t("loading")}
            </p>
          ) : repairs.length === 0 ? (
            <p className="text-[0.8rem] text-muted">{t("noActiveRepairs")}</p>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full border-collapse text-left [&_th]:whitespace-nowrap [&_th]:border-b [&_th]:border-border [&_th]:px-3 [&_th]:py-[0.6875rem] [&_th]:text-[0.72rem] [&_th]:font-bold [&_th]:text-muted [&_td]:min-w-[8.125rem] [&_td]:border-b [&_td]:border-border [&_td]:px-3 [&_td]:py-[0.8125rem] [&_td]:align-top [&_td]:text-[0.85rem] [&_td]:text-foreground [&_td:first-child]:min-w-[13.125rem] [&_td:first-child_strong]:block [&_td:first-child_span]:mt-1 [&_td:first-child_span]:block [&_td:first-child_span]:text-[0.76rem] [&_td:first-child_span]:text-muted [&_tbody_tr:last-child_td]:border-b-0 [&_td_strong]:block [&_td_strong]:font-semibold [&_td_span]:mt-1 [&_td_span]:block [&_td_span]:text-[0.76rem] [&_td_span]:text-muted">
                <thead>
                  <tr>
                    <th>{t("client")}</th>
                    <th>{t("repairDescription")}</th>
                    <th>{t("date")}</th>
                    <th>{t("status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {repairs.map((repair) => (
                    <tr key={repair.id}>
                      <td>
                        <strong>
                          {repair.clientFirstname} {repair.clientLastname}
                        </strong>
                        <span>{repair.clientEmail}</span>
                        <span>{repair.clientPhoneNumber}</span>
                      </td>
                      <td>
                        <strong>
                          {repair.description || t("notSpecified")}
                        </strong>
                        {repair.comment && <span>{repair.comment}</span>}
                      </td>
                      <td>{repair.date}</td>
                      <td>
                        <StatusBadge status={repair.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </AdminLayout>
  );
}
