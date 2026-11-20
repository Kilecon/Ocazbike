import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAdminToast } from "../../../components/admin/AdminToast";
import { Badge } from "../../../components/ui/badge";
import {
  createSupportRequest,
  listSupportRequests,
  resendSupportNotification,
} from "../../../services/support.api";
import type {
  CreatedSupportRequestDTO,
  SupportRequestDTO,
  SupportRequestStatus,
  SupportRequestType,
} from "../../../services/types";
import { AdminPageShell } from "../common/AdminPageShell";
import {
  CreateSupportDialog,
  type SupportRequestForm,
} from "./CreateSupportDialog";
import { SupportGrid } from "./SupportGrid";

const DEFAULT_PAGE_SIZE = 10;

export function SupportPage() {
  const { t } = useTranslation();
  const { showToast, showErrorToast } = useAdminToast();
  const [requests, setRequests] = useState<SupportRequestDTO[]>([]);
  const [created, setCreated] = useState<CreatedSupportRequestDTO | null>(null);
  const [saving, setSaving] = useState(false);
  const [resendingRequestId, setResendingRequestId] = useState<number | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [typeFilter, setTypeFilter] = useState<
    SupportRequestType | undefined
  >();
  const [statusFilter, setStatusFilter] = useState<
    SupportRequestStatus | undefined
  >();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listSupportRequests({
        page,
        limit: pageSize,
        type: typeFilter,
        status: statusFilter,
      });
      setRequests(result.requests);
      setHasNextPage(page * pageSize < result.total);
    } catch (loadError) {
      setRequests([]);
      setHasNextPage(false);
      showErrorToast(loadError, t("supportLoadError"));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, showErrorToast, statusFilter, t, typeFilter]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const submit = async (form: SupportRequestForm) => {
    setSaving(true);
    try {
      const createdRequest = await createSupportRequest(form);
      setCreated(createdRequest);
      setCreateDialogOpen(false);
      showToast("success", t("toastSuccess"), t("supportCreated"));
      if (createdRequest.discordNotification === "sent") {
        showToast("info", t("toastInfo"), t("supportDiscordSent"));
      } else {
        showToast("warning", t("toastWarning"), t("supportDiscordFailed"));
      }
      setPage(1);
      if (page === 1) await refresh();
    } catch (submitError) {
      showErrorToast(submitError, t("supportCreateError"));
    } finally {
      setSaving(false);
    }
  };

  const resendNotification = async (supportRequest: SupportRequestDTO) => {
    setResendingRequestId(supportRequest.id);
    try {
      const result = await resendSupportNotification(supportRequest.id);
      setRequests((current) =>
        current.map((request) => (request.id === result.id ? result : request)),
      );
      if (result.discordNotification === "sent") {
        showToast("success", t("toastSuccess"), t("supportNotificationResent"));
      } else {
        showToast("warning", t("toastWarning"), t("supportDiscordFailed"));
      }
    } catch (resendError) {
      showErrorToast(resendError, t("supportNotificationRetryError"));
      await refresh();
    } finally {
      setResendingRequestId(null);
    }
  };

  const changeTypeFilter = (type: SupportRequestType | undefined) => {
    setTypeFilter(type);
    setPage(1);
  };

  const changeStatusFilter = (status: SupportRequestStatus | undefined) => {
    setStatusFilter(status);
    setPage(1);
  };

  const clearFilters = () => {
    setTypeFilter(undefined);
    setStatusFilter(undefined);
    setPage(1);
  };

  return (
    <AdminPageShell labelledBy="support-title">
      <header className="mx-auto mb-6">
        <span className="text-[0.72rem] font-bold text-muted">
          {t("adminSupport")}
        </span>
        <h1
          className="mt-1 mb-0 font-[var(--font-display)] text-2xl leading-[1.2] font-bold text-foreground"
          id="support-title"
        >
          {t("supportTitle")}
        </h1>
        <p className="mt-1 mb-0 max-w-[38.75rem] leading-6 text-muted">
          {t("supportIntro")}
        </p>
      </header>

      {created && (
        <section
          className="mx-auto mb-4 rounded-[0.3125rem] border border-border bg-surface px-4 py-3"
          role="status"
        >
          <div className="flex items-center gap-2.5 text-foreground">
            <Badge variant="secondary">{created.reference}</Badge>
            <strong>{t("supportCreated")}</strong>
          </div>
          <p className="mt-2 mb-0 text-sm text-muted">
            {created.discordNotification === "sent"
              ? t("supportDiscordSent")
              : t("supportDiscordFailed")}
          </p>
        </section>
      )}

      <SupportGrid
        requests={requests}
        loading={loading}
        typeFilter={typeFilter}
        statusFilter={statusFilter}
        onTypeFilterChange={changeTypeFilter}
        onStatusFilterChange={changeStatusFilter}
        onCreate={() => setCreateDialogOpen(true)}
        onResendNotification={(request) => void resendNotification(request)}
        resendingRequestId={resendingRequestId}
        page={page}
        pageSize={pageSize}
        hasNextPage={hasNextPage}
        onPageChange={setPage}
        onPageSizeChange={(nextPageSize) => {
          setPageSize(nextPageSize);
          setPage(1);
        }}
        onClearFilters={clearFilters}
      />

      <CreateSupportDialog
        open={createDialogOpen}
        saving={saving}
        onClose={() => setCreateDialogOpen(false)}
        onSubmit={(form) => void submit(form)}
      />
    </AdminPageShell>
  );
}
