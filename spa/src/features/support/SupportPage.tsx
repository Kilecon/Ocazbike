import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAdminToast } from "@/shared/ui/AdminToast";
import { PageHeader, PageShell } from "@/shared/ui/PageShell";
import { useErrorToast } from "@/shared/ui/useErrorToast";
import { createSupportRequest, resendSupportNotification } from "./api";
import {
  CreateSupportDialog,
  type SupportRequestForm,
} from "./CreateSupportDialog";
import { supportRequestsQuery, useSupportRequestsChanged } from "./queries";
import { SupportGrid } from "./SupportGrid";
import type {
  SupportRequestDTO,
  SupportRequestStatus,
  SupportRequestType,
} from "./types";

const DEFAULT_PAGE_SIZE = 10;

export function SupportPage() {
  const { t } = useTranslation();
  const { showToast, showErrorToast } = useAdminToast();
  const [saving, setSaving] = useState(false);
  const [resendingRequestId, setResendingRequestId] = useState<number | null>(
    null,
  );
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [typeFilter, setTypeFilter] = useState<
    SupportRequestType | undefined
  >();
  const [statusFilter, setStatusFilter] = useState<
    SupportRequestStatus | undefined
  >();

  const supportRequests = useQuery(
    supportRequestsQuery({
      page,
      limit: pageSize,
      type: typeFilter,
      status: statusFilter,
    }),
  );
  useErrorToast(supportRequests.error, t("supportLoadError"));
  const failed = supportRequests.isError;
  const requests = failed ? [] : (supportRequests.data?.requests ?? []);
  const hasNextPage =
    !failed && page * pageSize < (supportRequests.data?.total ?? 0);
  const loading = supportRequests.isFetching;
  const requestsChanged = useSupportRequestsChanged();

  const submit = async (form: SupportRequestForm) => {
    setSaving(true);
    try {
      const createdRequest = await createSupportRequest(form);
      setCreateDialogOpen(false);
      showToast("success", t("toastSuccess"), t("supportCreated"));
      if (createdRequest.discordNotification === "sent") {
        showToast("info", t("toastInfo"), t("supportDiscordSent"));
      } else {
        showToast("warning", t("toastWarning"), t("supportDiscordFailed"));
      }
      setPage(1);
      await requestsChanged.refresh();
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
      requestsChanged.replace(result);
      if (result.discordNotification === "sent") {
        showToast("success", t("toastSuccess"), t("supportNotificationResent"));
      } else {
        showToast("warning", t("toastWarning"), t("supportDiscordFailed"));
      }
    } catch (resendError) {
      showErrorToast(resendError, t("supportNotificationRetryError"));
      await requestsChanged.refresh();
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
    <PageShell labelledBy="support-title">
      <PageHeader
        titleId="support-title"
        kicker={t("adminSupport")}
        title={t("supportTitle")}
        intro={t("supportIntro")}
      />

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
    </PageShell>
  );
}
