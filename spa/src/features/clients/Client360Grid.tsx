import { Link, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { Grid } from "@/shared/ui/Grid";
import { ClientSearchInput } from "./ClientSearchInput";
import { formatClientName } from "./format";
import type { ClientListItemDTO } from "./types";

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
}: Readonly<{
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
}>) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Grid
      title={t("clientRecords")}
      subtitle={t("clientGridSubtitle")}
      headerContent={
        <ClientSearchInput
          id="client360-search"
          value={search}
          onChange={onSearchChange}
        />
      }
      actions={[
        <Button key="add-client" type="button" onClick={onCreate}>
          <Plus size="1.0625rem" aria-hidden="true" />
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
              <Link
                className={`font-semibold text-foreground underline-offset-4 hover:underline ${client.isProfessional ? "" : "absolute inset-y-0 flex items-center"}`}
                to="/admin/clients/$clientId"
                params={{ clientId: client.id }}
                onClick={(event) => event.stopPropagation()}
              >
                {formatClientName(client.lastname, client.firstname)}
              </Link>
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
          render: (client: ClientListItemDTO) => (
            <Badge
              variant="secondary"
              color={client.isProfessional ? "success" : "draft"}
            >
              {t(
                client.isProfessional
                  ? "professionalClient"
                  : "individualClient",
              )}
            </Badge>
          ),
        },
      ]}
      rows={clients}
      getRowKey={(client) => client.id}
      onRowClick={(client) =>
        void navigate({
          to: "/admin/clients/$clientId",
          params: { clientId: client.id },
        })
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
