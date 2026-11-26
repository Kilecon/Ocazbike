import { useQuery } from "@tanstack/react-query";
import { type SubmitEvent, useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAdminToast } from "@/shared/ui/AdminToast";
import { PageHeader, PageShell } from "@/shared/ui/PageShell";
import { StatusTabs } from "@/shared/ui/StatusTabs";
import { useErrorToast } from "@/shared/ui/useErrorToast";
import { createUser, setUserActive, type UserStatus } from "./api";
import { CreateUserDialog } from "./CreateUserDialog";
import { userCountsQuery, usersQuery, useUsersChanged } from "./queries";
import type { ManagedUser } from "./types";
import { UsersGrid } from "./UsersGrid";

const emptyForm = {
  firstname: "",
  lastname: "",
  email: "",
  password: "",
  role: "Subadmin" as "Admin" | "Subadmin",
};
const DEFAULT_USERS_PER_PAGE = 10;
const MIN_USERS_PER_PAGE = 1;
const MAX_USERS_PER_PAGE = 50;
const usersPageSizeStorageKey = "adminUsersPageSize";

function getStoredPageSize() {
  const value = Number(
    localStorage.getItem(usersPageSizeStorageKey) ?? DEFAULT_USERS_PER_PAGE,
  );
  return Number.isInteger(value) &&
    value >= MIN_USERS_PER_PAGE &&
    value <= MAX_USERS_PER_PAGE
    ? value
    : DEFAULT_USERS_PER_PAGE;
}

export function UsersPage() {
  const { t } = useTranslation();
  const { showToast, showErrorToast } = useAdminToast();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [pageSize, setPageSize] = useState(getStoredPageSize);
  const [status, setStatus] = useState<UserStatus>("all");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);
  const tabsId = useId();
  const panelId = useId();
  const usersChanged = useUsersChanged();
  const usersResult = useQuery(usersQuery({ status, page, pageSize }));
  const countsResult = useQuery(userCountsQuery());
  const loadError = usersResult.error ?? countsResult.error;
  useErrorToast(loadError, t("usersLoadError"));
  const counts = loadError ? null : (countsResult.data ?? null);
  const lastPage = counts
    ? Math.max(1, Math.ceil(counts[status] / pageSize))
    : null;
  const pageOutOfRange = lastPage !== null && page > lastPage;
  const users = loadError || pageOutOfRange ? [] : (usersResult.data ?? []);
  const hasNextPage = lastPage !== null && page < lastPage;
  const loadingUsers =
    usersResult.isFetching || countsResult.isFetching || pageOutOfRange;

  // Deleting or filtering can leave the current page past the last one.
  useEffect(() => {
    if (lastPage !== null && page > lastPage) setPage(lastPage);
  }, [lastPage, page]);

  const submit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      await createUser(form);
      setForm(emptyForm);
      setCreateModalOpen(false);
      showToast("success", t("toastSuccess"), t("usersCreated"));
      setPage(1);
      void usersChanged();
    } catch (submitError) {
      showErrorToast(submitError, t("usersCreateError"));
    } finally {
      setSaving(false);
    }
  };

  const update = (field: keyof typeof emptyForm, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  const selectStatus = (nextStatus: UserStatus) => {
    if (status === nextStatus) return;
    setStatus(nextStatus);
    setPage(1);
  };

  const changePageSize = (nextPageSize: number) => {
    setPageSize(nextPageSize);
    localStorage.setItem(usersPageSizeStorageKey, String(nextPageSize));
    setPage(1);
  };

  const toggleUserActive = async (user: ManagedUser) => {
    setUpdatingUserId(user.id);
    try {
      await setUserActive(user.id, !user.isActive);
      showToast(
        "success",
        t("toastSuccess"),
        t(user.isActive ? "usersDeactivated" : "usersReactivated"),
      );
      void usersChanged();
    } catch (updateError) {
      showErrorToast(updateError, t("usersUpdateError"));
    } finally {
      setUpdatingUserId(null);
    }
  };

  return (
    <PageShell labelledBy="users-title">
      <PageHeader
        titleId="users-title"
        kicker={t("adminUsers")}
        title={t("usersTitle")}
        intro={t("usersIntro")}
      />

      <StatusTabs
        id={tabsId}
        panelId={panelId}
        label={t("usersStatusTabs")}
        selected={status}
        onSelect={selectStatus}
        tabs={[
          {
            value: "all",
            label: t("operationFilterAll"),
            count: counts?.all ?? null,
          },
          {
            value: "active",
            label: t("usersActiveTab"),
            count: counts?.active ?? null,
          },
          {
            value: "inactive",
            label: t("usersInactiveTab"),
            count: counts?.inactive ?? null,
          },
        ]}
      />
      <div role="tabpanel" id={panelId} aria-labelledby={`${tabsId}-${status}`}>
        <UsersGrid
          users={users}
          loading={loadingUsers}
          status={status}
          onCreate={() => setCreateModalOpen(true)}
          onToggleUserActive={(user) => void toggleUserActive(user)}
          updatingUserId={updatingUserId}
          page={page}
          pageSize={pageSize}
          hasNextPage={hasNextPage}
          onPageChange={setPage}
          onPageSizeChange={changePageSize}
        />
      </div>

      <CreateUserDialog
        open={createModalOpen}
        form={form}
        saving={saving}
        onChange={update}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={(event) => void submit(event)}
      />
    </PageShell>
  );
}
