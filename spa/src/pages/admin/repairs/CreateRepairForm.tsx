import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import type {
  BillingDocumentStatus,
  ClientListItemDTO,
} from "../../../services/types";

export interface RepairFormValues {
  date: string;
  status: BillingDocumentStatus;
  comment: string;
  description: string;
  unitPrice: string;
  vatRate: string;
}

const statuses: BillingDocumentStatus[] = [
  "created",
  "pending",
  "in_progress",
  "completed",
  "paid",
];

export function CreateRepairForm({
  clientSearch,
  clientResults,
  selectedClientId,
  form,
  total,
  saving,
  onClientSearchChange,
  onClientSelect,
  onChange,
  onSubmit,
}: {
  clientSearch: string;
  clientResults: ClientListItemDTO[];
  selectedClientId: number | null;
  form: RepairFormValues;
  total: string;
  saving: boolean;
  onClientSearchChange: (search: string) => void;
  onClientSelect: (client: ClientListItemDTO) => void;
  onChange: <K extends keyof RepairFormValues>(
    field: K,
    value: RepairFormValues[K],
  ) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const { t } = useTranslation();

  return (
    <form
      className="mx-auto mb-[1.125rem] grid max-w-[77.5rem] gap-3.5 rounded-md border border-border bg-surface p-5 max-[35rem]:p-[0.9375rem] [&>label]:grid [&>label]:gap-1.5 [&>label]:text-sm [&>label]:font-semibold [&>label]:text-foreground [&_select]:min-h-11 [&_select]:rounded-[0.3125rem] [&_select]:border [&_select]:border-control-border [&_select]:bg-surface [&_select]:px-[0.6875rem] [&_select]:py-[0.5625rem] [&_select]:text-foreground"
      onSubmit={onSubmit}
    >
      <h2 className="m-0 text-[1.05rem] text-foreground">{t("newRepair")}</h2>
      <label
        className="grid gap-1.5 text-sm font-semibold text-foreground"
        htmlFor="repair-client-search"
      >
        {t("client")}
        <Input
          id="repair-client-search"
          maxLength={50}
          value={clientSearch}
          onChange={(event) => onClientSearchChange(event.target.value)}
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
              onClick={() => onClientSelect(client)}
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
            onChange={(event) => onChange("description", event.target.value)}
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
            onChange={(event) => onChange("date", event.target.value)}
            required
          />
        </label>
        <label htmlFor="repair-status">
          {t("status")}
          <select
            className="min-h-11 rounded-[0.3125rem] border border-control-border bg-surface px-[0.6875rem] py-[0.5625rem] text-foreground"
            id="repair-status"
            value={form.status}
            onChange={(event) => {
              const status = statuses.find(
                (option) => option === event.target.value,
              );
              if (status) onChange("status", status);
            }}
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
            onChange={(event) => onChange("unitPrice", event.target.value)}
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
            onChange={(event) => onChange("vatRate", event.target.value)}
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
            onChange={(event) => onChange("comment", event.target.value)}
          />
        </label>
      </div>
      <div className="mt-1 flex items-center justify-end gap-3 max-[35rem]:items-stretch max-[35rem]:flex-col [&_[data-slot=button]]:max-[35rem]:w-full">
        <Button type="submit" disabled={saving || !selectedClientId}>
          {saving ? t("saving") : t("saveRepair")}
        </Button>
      </div>
    </form>
  );
}
