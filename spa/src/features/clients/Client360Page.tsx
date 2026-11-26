import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useDebouncedValue } from "@/shared/lib/useDebouncedValue";
import { Modal } from "@/shared/ui/Modal";
import { PageHeader, PageShell } from "@/shared/ui/PageShell";
import { useErrorToast } from "@/shared/ui/useErrorToast";
import { Client360Grid } from "./Client360Grid";
import { ClientDetailPage } from "./ClientDetailPage";
import { clientsQuery } from "./queries";

export function Client360Page({
  openCreate = false,
}: Readonly<{
  openCreate?: boolean;
}>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const term = search.trim();
  const debouncedTerm = useDebouncedValue(term, term ? 350 : 0);
  // One or two characters are too broad: keep showing the previous results.
  const searchable = debouncedTerm.length === 0 || debouncedTerm.length >= 3;
  const clients = useQuery({
    ...clientsQuery({
      page,
      limit: pageSize,
      search: debouncedTerm || undefined,
    }),
    enabled: searchable && debouncedTerm === term,
  });
  useErrorToast(clients.error, t("client360LoadError"));
  const result = clients.data;
  const loading = clients.isFetching || (searchable && debouncedTerm !== term);
  const [createModalOpen, setCreateModalOpen] = useState(openCreate);

  const closeCreateModal = () => {
    setCreateModalOpen(false);
    if (openCreate) void navigate({ to: "/admin/clients", replace: true });
  };

  return (
    <PageShell labelledBy="client360-title">
      <PageHeader
        titleId="client360-title"
        kicker={t("adminView360")}
        title={t("client360Title")}
        intro={t("client360Intro")}
      />

      <Client360Grid
        clients={result?.clients ?? []}
        total={result?.total ?? 0}
        loading={loading}
        page={page}
        pageSize={pageSize}
        search={search}
        onSearchChange={(nextSearch) => {
          setSearch(nextSearch);
          setPage(1);
        }}
        onCreate={() => setCreateModalOpen(true)}
        onPageChange={setPage}
        onPageSizeChange={(nextPageSize) => {
          setPageSize(nextPageSize);
          setPage(1);
        }}
      />

      {createModalOpen && (
        <Modal aria-labelledby="client-detail-title" onClose={closeCreateModal}>
          <ClientDetailPage
            createMode
            onCancel={closeCreateModal}
            onCreated={(clientId) =>
              void navigate({
                to: "/admin/clients/$clientId",
                params: { clientId },
              })
            }
          />
        </Modal>
      )}
    </PageShell>
  );
}
