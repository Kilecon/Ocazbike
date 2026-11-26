import { Pencil } from "lucide-react";
import type { SubmitEvent } from "react";
import { useTranslation } from "react-i18next";
import { AddressInput } from "@/shared/ui/AddressInput";
import { Button } from "@/shared/ui/Button";
import { ClientTextField } from "./ClientTextField";
import { formatClientFirstName, formatClientLastName } from "./format";

export interface ClientForm {
  firstname: string;
  lastname: string;
  email: string;
  phonenumber: string;
  address: string;
  addressComplement: string;
  identityCardNumber: string;
  privatenote: string;
  isProfessional: boolean;
  siret: string;
  companyName: string;
}

interface ClientDisplayField {
  label: string;
  value: string;
}

interface ClientDisplayColumn {
  id: string;
  fields: ClientDisplayField[];
}

function displayColumnsForClient(
  form: ClientForm,
  createdAt: string | null,
  labels: {
    email: string;
    phone: string;
    since: string;
    companyName: string;
    siret: string;
    address: string;
    identityCardNumber: string;
  },
): ClientDisplayColumn[] {
  const contactFields: ClientDisplayField[] = [];
  if (form.email.trim()) {
    contactFields.push({ label: labels.email, value: form.email.trim() });
  }
  if (form.phonenumber.trim()) {
    contactFields.push({ label: labels.phone, value: form.phonenumber.trim() });
  }
  const clientSinceFields: ClientDisplayField[] = createdAt
    ? [{ label: labels.since, value: createdAt }]
    : [];
  const address = [form.address.trim(), form.addressComplement.trim()]
    .filter(Boolean)
    .join("\n");
  const displayColumns: ClientDisplayColumn[] = [];
  if (form.isProfessional) {
    displayColumns.push(
      {
        id: "business",
        fields: [
          {
            label: labels.companyName,
            value: form.companyName.trim() || "-",
          },
          { label: labels.siret, value: form.siret.trim() || "-" },
        ],
      },
      { id: "contact", fields: contactFields },
      {
        id: "address",
        fields: [
          ...(address ? [{ label: labels.address, value: address }] : []),
          ...clientSinceFields,
        ],
      },
    );
  } else {
    displayColumns.push({ id: "contact", fields: contactFields });
    if (address) {
      displayColumns.push({
        id: "address",
        fields: [{ label: labels.address, value: address }],
      });
    } else {
      displayColumns.push({ id: "address", fields: clientSinceFields });
    }
    displayColumns.push({
      id: "identity",
      fields: [
        {
          label: labels.identityCardNumber,
          value: form.identityCardNumber.trim() || "-",
        },
        ...clientSinceFields,
      ],
    });
  }
  return displayColumns;
}

export function ClientInformationPanel({
  form,
  createdAt,
  hasChanges,
  showTypeSelector,
  canEdit,
  editing,
  saving,
  onEdit,
  onChange,
  onCancel,
  onSubmit,
}: Readonly<{
  form: ClientForm;
  createdAt: string | null;
  hasChanges: boolean;
  showTypeSelector: boolean;
  canEdit: boolean;
  editing: boolean;
  saving: boolean;
  onEdit: () => void;
  onChange: (field: keyof ClientForm, value: string | boolean) => void;
  onCancel: () => void;
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
}>) {
  const { t } = useTranslation();
  const displayColumns = displayColumnsForClient(form, createdAt, {
    email: t("clientEmail"),
    phone: t("clientPhone"),
    since: t("clientSince"),
    companyName: t("clientCompanyName"),
    siret: t("clientSiret"),
    address: t("clientAddress"),
    identityCardNumber: t("clientIdentityCardNumber"),
  });

  return (
    <section className="oz-card mx-auto max-w-[77.5rem]">
      <header className="flex items-center justify-between gap-4 border-b border-border p-4">
        {showTypeSelector ? (
          <fieldset
            className="relative grid w-full grid-cols-2 border-0 p-0"
            aria-label={t("clientType")}
          >
            <button
              className={`min-h-11 bg-transparent px-3 pb-3 text-sm font-semibold transition-colors ${form.isProfessional ? "text-muted" : "text-primary"}`}
              id="client-type-individual"
              type="button"
              aria-pressed={!form.isProfessional}
              onClick={() => onChange("isProfessional", false)}
            >
              {t("individualClient")}
            </button>
            <button
              className={`min-h-11 bg-transparent px-3 pb-3 text-sm font-semibold transition-colors ${form.isProfessional ? "text-primary" : "text-muted"}`}
              id="client-type-professional"
              type="button"
              aria-pressed={form.isProfessional}
              onClick={() => onChange("isProfessional", true)}
            >
              {t("professionalClient")}
            </button>
            <span
              className={`absolute inset-x-0 bottom-0 h-0.5 w-1/2 bg-primary transition-transform duration-300 ease-in-out ${form.isProfessional ? "translate-x-full" : ""}`}
              aria-hidden="true"
            />
          </fieldset>
        ) : (
          <h2 className="oz-card-title m-0 text-foreground">
            {t("clientInformation")}
          </h2>
        )}
        {!showTypeSelector && canEdit && !editing && (
          <Button type="button" onClick={onEdit}>
            <Pencil size="1rem" aria-hidden="true" />
            {t("editClient")}
          </Button>
        )}
      </header>

      <form className="grid gap-5 p-5" onSubmit={onSubmit}>
        {!showTypeSelector && !editing ? (
          <dl className="m-0 grid min-w-0 grid-cols-3 gap-x-6 gap-y-3 max-[45rem]:grid-cols-1">
            {displayColumns.map(({ id, fields }) => (
              <div className="grid content-start gap-y-3" key={id}>
                {fields.map(({ label, value }) => (
                  <div className="min-w-0" key={label}>
                    <dt className="text-xs font-semibold text-muted">
                      {label}
                    </dt>
                    <dd className="mt-0.5 mb-0 break-words text-sm text-foreground whitespace-pre-line">
                      {value}
                    </dd>
                  </div>
                ))}
              </div>
            ))}
            {form.privatenote.trim() && (
              <div className="col-span-full min-w-0">
                <dt className="text-xs font-semibold text-muted">
                  {t("clientPrivateNote")}
                </dt>
                <dd className="mt-0.5 mb-0 break-words text-sm text-foreground whitespace-pre-line">
                  {form.privatenote.trim()}
                </dd>
              </div>
            )}
          </dl>
        ) : (
          <fieldset
            className="grid min-w-0 grid-cols-2 gap-4 border-0 p-0 max-[45rem]:grid-cols-1"
            disabled={!editing || saving}
          >
            <legend className="sr-only">{t("clientInformation")}</legend>
            <ClientTextField
              id="client-firstname"
              className="capitalize"
              label={t("clientFirstName")}
              value={form.firstname}
              pattern={String.raw`.*\S.*`}
              required
              onChange={(value) => onChange("firstname", value)}
              onBlur={() =>
                onChange("firstname", formatClientFirstName(form.firstname))
              }
            />
            <ClientTextField
              id="client-lastname"
              className="uppercase"
              label={t("clientLastName")}
              value={form.lastname}
              pattern={String.raw`.*\S.*`}
              required
              onChange={(value) => onChange("lastname", value)}
              onBlur={() =>
                onChange("lastname", formatClientLastName(form.lastname))
              }
            />
            <ClientTextField
              id="client-email"
              label={t("clientEmail")}
              type="email"
              autoComplete="email"
              value={form.email}
              required={!form.phonenumber.trim()}
              onChange={(value) => onChange("email", value)}
            />
            <ClientTextField
              id="client-phone"
              label={t("clientPhone")}
              type="tel"
              autoComplete="tel"
              maxLength={40}
              value={form.phonenumber}
              required={!form.email.trim()}
              onChange={(value) => onChange("phonenumber", value)}
            />
            <label className="oz-field" htmlFor="client-address">
              {t("clientAddress")}
              <AddressInput
                id="client-address"
                value={form.address}
                onChange={(value) => onChange("address", value)}
              />
            </label>
            <ClientTextField
              id="client-address-complement"
              label={t("clientAddressComplement")}
              value={form.addressComplement}
              onChange={(value) => onChange("addressComplement", value)}
            />
            {!form.isProfessional && (
              <ClientTextField
                id="client-identity-card-number"
                label={t("clientIdentityCardNumber")}
                value={form.identityCardNumber}
                onChange={(value) => onChange("identityCardNumber", value)}
              />
            )}
            {!showTypeSelector && (
              <label className="flex min-h-11 items-center gap-2 text-sm font-semibold text-foreground">
                <input
                  className="size-4 accent-primary"
                  type="checkbox"
                  checked={form.isProfessional}
                  onChange={(event) =>
                    onChange("isProfessional", event.target.checked)
                  }
                />
                {t("clientProfessional")}
              </label>
            )}
            {form.isProfessional && (
              <>
                <ClientTextField
                  id="client-company"
                  label={t("clientCompanyName")}
                  value={form.companyName}
                  onChange={(value) => onChange("companyName", value)}
                />
                <ClientTextField
                  id="client-siret"
                  label={t("clientSiret")}
                  value={form.siret}
                  onChange={(value) => onChange("siret", value)}
                />
              </>
            )}
            <div className="col-span-full">
              <ClientTextField
                id="client-private-note"
                label={t("clientPrivateNote")}
                value={form.privatenote}
                multiline
                onChange={(value) => onChange("privatenote", value)}
              />
            </div>
          </fieldset>
        )}
        {editing && (
          <div className="flex justify-end gap-3 border-t border-border pt-4 max-[35rem]:flex-col-reverse">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={onCancel}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={saving || !hasChanges}>
              {saving ? t("loading") : t("saveClient")}
            </Button>
          </div>
        )}
      </form>
    </section>
  );
}
