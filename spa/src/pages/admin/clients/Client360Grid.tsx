import { Plus, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/ui/button";
import { Grid } from "../../../components/ui/Grid";
import { Input } from "../../../components/ui/input";
import { formatClientName } from "../../../lib/client";
import type { ClientListItemDTO } from "../../../services/types";

export function Client360Grid({
  clients,
  total,
  loading,
  page,
  pageSize,
  search,
  onSearchChange,
  onCreate,
  onPageChange,
  onPageSizeChange,
}: {
  clients: ClientListItemDTO[];
  total: number;
  loading: boolean;
  page: number;
  pageSize: number;
  search: string;
  onSearchChange: (search: string) => void;
  onCreate: () => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const { t } = useTranslation();

  return (
    <Grid
      title={t("clientRecords")}
      subtitle={t("clientGridSubtitle")}
      headerContent={
        <div className="mx-auto flex w-full max-w-[30rem] min-w-0 items-center gap-[0.5rem]">
          <Search
            className="size-[1.25rem] shrink-0 text-muted"
            aria-hidden="true"
          />
          <Input
            className="min-w-0"
            id="client360-search"
            type="search"
            aria-label={t("searchClient")}
            maxLength={50}
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={t("clientSearchPlaceholder")}
          />
        </div>
      }
      actions={[
        <Button key="add-client" type="button" onClick={onCreate}>
          <Plus size={17} aria-hidden="true" />
          {t("addClient")}
        </Button>,
      ]}
      columns={[
        {
          key: "name",
          title: (
            <div className="grid gap-[0.25rem]">
              <span>{t("clientName")}</span>
              <span className="text-xs font-normal">
                {t("clientCompanyName")}
              </span>
            </div>
          ),
          render: (client: ClientListItemDTO) => (
            <div className="relative grid min-h-10 content-center gap-[0.25rem]">
              <a
                className={`font-semibold text-foreground underline-offset-4 hover:underline ${client.isProfessional ? "" : "absolute inset-y-0 flex items-center"}`}
                href={`/admin/clients/${client.id}`}
                onClick={(event) => event.stopPropagation()}
              >
                {formatClientName(client.lastname, client.firstname)}
              </a>
              <span
                className="min-h-4 text-xs leading-4 text-muted"
                aria-hidden={!client.isProfessional}
              >
                {client.isProfessional
                  ? client.companyName?.trim() ||
                    t("clientMissingBusinessField")
                  : ""}
              </span>
            </div>
          ),
        },
        {
          key: "email",
          title: (
            <div className="grid gap-[0.25rem]">
              <span>{t("clientEmail")}</span>
              <span className="text-xs font-normal">{t("clientSiret")}</span>
            </div>
          ),
          render: (client: ClientListItemDTO) => (
            <div className="relative grid min-h-10 content-center gap-[0.25rem]">
              <span
                className={
                  client.isProfessional
                    ? ""
                    : "absolute inset-y-0 flex items-center"
                }
              >
                {client.email?.trim() || "-"}
              </span>
              <span
                className="min-h-4 text-xs leading-4 text-muted"
                aria-hidden={!client.isProfessional}
              >
                {client.isProfessional
                  ? client.siret?.trim() || t("clientMissingBusinessField")
                  : ""}
              </span>
            </div>
          ),
        },
        {
          key: "phone",
          title: t("clientPhone"),
          render: (client: ClientListItemDTO) =>
            client.phonenumber?.trim() || "-",
        },
        {
          key: "category",
          title: t("clientCategory"),
          render: (client: ClientListItemDTO) =>
            t(
              client.isProfessional ? "professionalClient" : "individualClient",
            ),
        },
      ]}
      rows={clients}
      getRowKey={(client) => client.id}
      onRowClick={(client) =>
        window.location.assign(`/admin/clients/${client.id}`)
      }
      busy={loading}
      emptyMessage={loading ? undefined : t("noClientsFound")}
      pagination={{
        page,
        pageSize,
        hasNextPage: page * pageSize < total,
        onPageChange,
        onPageSizeChange,
      }}
    />
  );
}
