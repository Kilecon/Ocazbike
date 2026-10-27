import { type FormEvent, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAdminToast } from "../../../components/admin/AdminToast";
import {
  createUser,
  listUsers,
  setUserActive,
} from "../../../services/auth.api";
import type { ManagedUser } from "../../../services/types";
import { AdminPageShell } from "../common/AdminPageShell";
import { CreateUserDialog } from "./CreateUserDialog";
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
const usersStatusFilterStorageKey = "adminUsersStatusFilter";

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
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [pageSize, setPageSize] = useState(getStoredPageSize);
  const [activeOnly, setActiveOnly] = useState(
    () => localStorage.getItem(usersStatusFilterStorageKey) !== "all",
  );
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);
  const refresh = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const pageUsers = await listUsers(activeOnly, page, pageSize);
      setUsers(pageUsers);
      setHasNextPage(false);

      if (pageUsers.length === pageSize) {
        const nextPageUsers = await listUsers(
          activeOnly,
          page * pageSize + 1,
          1,
        );
        setHasNextPage(nextPageUsers.length > 0);
      }
    } catch (loadError) {
      setHasNextPage(false);
      showErrorToast(loadError, t("usersLoadError"));
    } finally {
      setLoadingUsers(false);
    }
  }, [activeOnly, page, pageSize, showErrorToast, t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      await createUser(form);
      setForm(emptyForm);
      setCreateModalOpen(false);
      showToast("success", t("toastSuccess"), t("usersCreated"));
      setPage(1);
      if (page === 1) {
        await refresh();
      }
    } catch (submitError) {
      showErrorToast(submitError, t("usersCreateError"));
    } finally {
      setSaving(false);
    }
  };

  const update = (field: keyof typeof emptyForm, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  const selectStatusFilter = (nextActiveOnly: boolean) => {
    setActiveOnly(nextActiveOnly);
    localStorage.setItem(
      usersStatusFilterStorageKey,
      nextActiveOnly ? "active" : "all",
    );
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
      await refresh();
    } catch (updateError) {
      showErrorToast(updateError, t("usersUpdateError"));
    } finally {
      setUpdatingUserId(null);
    }
  };

  return (
    <AdminPageShell labelledBy="users-title">
      <header className="mx-auto mb-6">
        <span className="text-[0.72rem] font-bold text-muted">
          {t("adminUsers")}
        </span>
        <h1
          className="mt-1 mb-0 font-[var(--font-display)] text-2xl leading-[1.2] font-bold text-foreground"
          id="users-title"
        >
          {t("usersTitle")}
        </h1>
        <p className="mt-1 mb-0 max-w-[38.75rem] leading-6 text-muted">
          {t("usersIntro")}
        </p>
      </header>

      <UsersGrid
        users={users}
        loading={loadingUsers}
        activeOnly={activeOnly}
        onStatusFilterChange={selectStatusFilter}
        onCreate={() => setCreateModalOpen(true)}
        onToggleUserActive={(user) => void toggleUserActive(user)}
        updatingUserId={updatingUserId}
        page={page}
        pageSize={pageSize}
        hasNextPage={hasNextPage}
        onPageChange={setPage}
        onPageSizeChange={changePageSize}
        onClearFilters={() => selectStatusFilter(false)}
      />

      <CreateUserDialog
        open={createModalOpen}
        form={form}
        saving={saving}
        onChange={update}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={(event) => void submit(event)}
      />
    </AdminPageShell>
  );
}
