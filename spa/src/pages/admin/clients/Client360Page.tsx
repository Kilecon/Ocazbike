import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAdminToast } from "../../../components/admin/AdminToast";
import { getClientsPage } from "../../../services/clients.api";
import type { ClientPageDTO } from "../../../services/types";
import { AdminPageShell } from "../common/AdminPageShell";
import { Client360Grid } from "./Client360Grid";
import { ClientDetailPage } from "./ClientDetailPage";

export function Client360Page({
  openCreate = false,
}: {
  openCreate?: boolean;
}) {
  const { t } = useTranslation();
  const { showErrorToast } = useAdminToast();
  const [result, setResult] = useState<ClientPageDTO | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(openCreate);
  const createModalRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = createModalRef.current;
    if (createModalOpen && dialog && !dialog.open) dialog.showModal();
  }, [createModalOpen]);

  const closeCreateModal = () => {
    setCreateModalOpen(false);
    if (window.location.pathname.replace(/\/+$/, "") === "/admin/clients/new") {
      window.history.replaceState(null, "", "/admin/clients");
    }
  };

  useEffect(() => {
    const term = search.trim();
    if (term.length > 0 && term.length < 3) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    const timer = window.setTimeout(
      () => {
        void getClientsPage({
          page,
          limit: pageSize,
          search: term || undefined,
        })
          .then((clients) => {
            if (active) setResult(clients);
          })
          .catch((loadError: unknown) => {
            if (active) showErrorToast(loadError, t("client360LoadError"));
          })
          .finally(() => {
            if (active) setLoading(false);
          });
      },
      term ? 350 : 0,
    );

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [page, pageSize, search, showErrorToast, t]);

  return (
    <AdminPageShell labelledBy="client360-title">
      <header className="mx-auto mb-6">
        <span className="text-[0.72rem] font-bold text-muted">
          {t("adminView360")}
        </span>
        <h1
          className="mt-1 mb-0 font-[var(--font-display)] text-2xl leading-[1.2] font-bold text-foreground"
          id="client360-title"
        >
          {t("client360Title")}
        </h1>
        <p className="mt-1 mb-0 max-w-[38.75rem] leading-6 text-muted">
          {t("client360Intro")}
        </p>
      </header>

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
        <dialog
          ref={createModalRef}
          className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[min(48rem,calc(100vw-2rem))] max-w-none overflow-y-auto rounded-md border border-border bg-surface p-0 text-foreground shadow-xl backdrop:bg-black/50"
          aria-labelledby="client-detail-title"
          onClose={closeCreateModal}
        >
          <ClientDetailPage
            createMode
            onCancel={closeCreateModal}
            onCreated={(clientId) =>
              window.location.assign(`/admin/clients/${clientId}`)
            }
          />
        </dialog>
      )}
    </AdminPageShell>
  );
}
