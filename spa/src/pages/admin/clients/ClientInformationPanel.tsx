import { Pencil } from "lucide-react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/ui/button";
import {
  formatClientFirstName,
  formatClientLastName,
} from "../../../lib/client";
import { ClientTextField } from "./ClientTextField";

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
}: {
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
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const { t } = useTranslation();
  const contactFields = [
    ...(form.email.trim()
      ? [{ label: t("clientEmail"), value: form.email.trim() }]
      : []),
    ...(form.phonenumber.trim()
      ? [{ label: t("clientPhone"), value: form.phonenumber.trim() }]
      : []),
  ];
  const clientSinceField = createdAt
    ? [{ label: t("clientSince"), value: createdAt }]
    : [];
  const address = [form.address.trim(), form.addressComplement.trim()]
    .filter(Boolean)
    .join("\n");
  const displayColumns = form.isProfessional
    ? [
        {
          id: "business",
          fields: [
            {
              label: t("clientCompanyName"),
              value: form.companyName.trim() || "-",
            },
            { label: t("clientSiret"), value: form.siret.trim() || "-" },
          ],
        },
        { id: "contact", fields: contactFields },
        {
          id: "address",
          fields: [
            ...(address ? [{ label: t("clientAddress"), value: address }] : []),
            ...clientSinceField,
          ],
        },
      ]
    : [
        { id: "contact", fields: contactFields },
        ...(address
          ? [
              {
                id: "address",
                fields: [
                  ...(address
                    ? [{ label: t("clientAddress"), value: address }]
                    : []),
                ],
              },
            ]
          : [{ id: "address", fields: clientSinceField }]),
        {
          id: "identity",
          fields: [
            {
              label: t("clientIdentityCardNumber"),
              value: form.identityCardNumber.trim() || "-",
            },
            ...clientSinceField,
          ],
        },
      ];

  return (
    <section className="mx-auto max-w-[77.5rem] rounded-md border border-border bg-surface">
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
          <h2 className="m-0 text-base font-bold text-foreground">
            {t("clientInformation")}
          </h2>
        )}
        {!showTypeSelector && canEdit && !editing && (
          <Button type="button" onClick={onEdit}>
            <Pencil size={16} aria-hidden="true" />
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
              value={form.email}
              required={!form.phonenumber.trim()}
              onChange={(value) => onChange("email", value)}
            />
            <ClientTextField
              id="client-phone"
              label={t("clientPhone")}
              type="tel"
              value={form.phonenumber}
              required={!form.email.trim()}
              onChange={(value) => onChange("phonenumber", value)}
            />
            <ClientTextField
              id="client-address"
              label={t("clientAddress")}
              value={form.address}
              onChange={(value) => onChange("address", value)}
            />
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
