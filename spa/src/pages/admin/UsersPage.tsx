import { ChevronLeft, ChevronRight, Funnel, Plus, X } from "lucide-react";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { useAdminToast } from "../../components/admin/AdminToast";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Grid } from "../../components/ui/Grid";
import { Input } from "../../components/ui/input";
import { Tooltip } from "../../components/ui/tooltip";
import { useCurrentUser } from "../../contexts/CurrentUser";
import { AdminLayout } from "../../layouts/AdminLayout";
import { primitivesColors } from "../../lib/tokens";
import { createUser, listUsers, setUserActive } from "../../services/auth.api";
import type { ManagedUser } from "../../services/types";

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
  const [pageSizeInput, setPageSizeInput] = useState(() =>
    String(getStoredPageSize()),
  );
  const [activeOnly, setActiveOnly] = useState(
    () => localStorage.getItem(usersStatusFilterStorageKey) !== "all",
  );
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [statusFilterOpen, setStatusFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);
  const currentUser = useCurrentUser();
  const statusFilterRef = useRef<HTMLDivElement>(null);
  const createModalRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = createModalRef.current;
    if (createModalOpen && dialog && !dialog.open) {
      dialog?.showModal();
    }
  }, [createModalOpen]);

  useEffect(() => {
    if (!statusFilterOpen) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !statusFilterRef.current?.contains(event.target)
      ) {
        setStatusFilterOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setStatusFilterOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [statusFilterOpen]);

  const selectStatusFilter = (nextActiveOnly: boolean) => {
    setActiveOnly(nextActiveOnly);
    localStorage.setItem(
      usersStatusFilterStorageKey,
      nextActiveOnly ? "active" : "all",
    );
    setStatusFilterOpen(false);
    setPage(1);
  };

  const clearFilters = () => selectStatusFilter(false);

  const commitPageSize = () => {
    const parsedPageSize = Number(pageSizeInput.trim());
    const nextPageSize =
      pageSizeInput.trim() !== "" &&
      Number.isInteger(parsedPageSize) &&
      parsedPageSize >= MIN_USERS_PER_PAGE &&
      parsedPageSize <= MAX_USERS_PER_PAGE
        ? parsedPageSize
        : DEFAULT_USERS_PER_PAGE;
    setPageSizeInput(String(nextPageSize));
    setPageSize(nextPageSize);
    localStorage.setItem(usersPageSizeStorageKey, String(nextPageSize));
    setPage(1);
  };

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
    <AdminLayout>
      <main
        className="min-h-screen min-w-0 flex-1 p-[clamp(1.5rem,4vw,3.5rem)] max-[45rem]:min-h-0 max-[45rem]:px-4 max-[45rem]:pt-6 max-[45rem]:pb-10"
        aria-labelledby="users-title"
      >
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

        <Grid
          title={t("userListGridTitle")}
          subtitle={t("userListGridsubTitle")}
          actions={[
            <Button
              key="create-user"
              type="button"
              onClick={() => setCreateModalOpen(true)}
            >
              <Plus size={17} aria-hidden="true" />
              {t("createUserButton")}
            </Button>,
          ]}
          activeFilters={
            activeOnly
              ? [
                  {
                    key: "status",
                    label: t("usersActiveStatusFilter"),
                    removeLabel: t("usersRemoveActiveStatusFilter"),
                    onRemove: clearFilters,
                  },
                ]
              : []
          }
          activeFiltersLabel={t("activeFilters")}
          clearFiltersLabel={t("clearFilters")}
          onClearFilters={clearFilters}
          columns={[
              {
                key: "name",
                title: t("usersLastname"),
                render: (user) => `${user.firstname} ${user.lastname}`,
              },
              {
                key: "email",
                title: t("usersEmail"),
                render: (user) => user.email,
              },
              {
                key: "role",
                title: t("usersRole"),
                render: (user) => (
                  <Badge
                    variant="secondary"
                    color={
                      user.role === "Admin"
                        ? primitivesColors.greenGreen700
                        : primitivesColors.greenGreen800
                    }
                  >
                    {t(`role${user.role}`)}
                  </Badge>
                ),
              },
              {
                key: "status",
                title: t("usersStatus"),
                filter: (
                  <div
                    className="relative flex w-fit items-center gap-2"
                    ref={statusFilterRef}
                  >
                    <button
                      className={`relative grid size-8 place-items-center rounded-[0.3125rem] text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${statusFilterOpen ? "bg-surface-muted" : ""}`}
                      type="button"
                      aria-label={`${t("usersFilter")}: ${t(activeOnly ? "usersFilterActive" : "usersFilterAll")}`}
                      aria-expanded={statusFilterOpen}
                      aria-haspopup="menu"
                      onClick={() => setStatusFilterOpen((open) => !open)}
                    >
                      <Funnel
                        className={`size-4 ${activeOnly ? "fill-current" : ""}`}
                        aria-hidden="true"
                      />
                      {activeOnly && (
                        <span className="absolute top-0.5 right-0.5 size-2 rounded-full bg-primary ring-2 ring-surface" />
                      )}
                    </button>
                    {statusFilterOpen && (
                      <div
                        className="absolute top-full right-0 z-20 mt-2 grid min-w-[11.875rem] gap-1 rounded-md border border-border bg-surface p-1.5 text-foreground shadow-lg"
                        role="menu"
                        aria-label={t("usersFilter")}
                      >
                        <button
                          className="flex min-h-10 items-center gap-2 rounded px-2 text-left text-sm hover:bg-surface-muted"
                          type="button"
                          role="menuitemradio"
                          aria-checked={activeOnly}
                          onClick={() => selectStatusFilter(true)}
                        >
                          {activeOnly ? (
                            <Funnel
                              className="size-4 shrink-0"
                              aria-hidden="true"
                            />
                          ) : (
                            <span className="size-4 shrink-0" />
                          )}
                          {t("usersFilterActive")}
                        </button>
                        <button
                          className="flex min-h-10 items-center gap-2 rounded px-2 text-left text-sm hover:bg-surface-muted"
                          type="button"
                          role="menuitemradio"
                          aria-checked={!activeOnly}
                          onClick={() => selectStatusFilter(false)}
                        >
                          {!activeOnly ? (
                            <Funnel
                              className="size-4 shrink-0"
                              aria-hidden="true"
                            />
                          ) : (
                            <span className="size-4 shrink-0" />
                          )}
                          {t("usersFilterAll")}
                        </button>
                      </div>
                    )}
                  </div>
                ),
                render: (user) =>
                  user.isActive ? t("usersActive") : t("usersInactive"),
              },
              {
                key: "lastLogin",
                title: t("usersLastLogin"),
                render: (user) =>
                  user.lastLoginAtEpochMs === null
                    ? "—"
                    : new Date(user.lastLoginAtEpochMs).toLocaleString(),
              },
              {
                key: "actions",
                title: t("usersActions"),
                render: (user) => {
                  const isCurrentUser = user.email === currentUser?.email;

                  return (
                    <Button
                      type="button"
                      size="sm"
                      variant={user.isActive ? "destructive" : "outline"}
                      disabled={updatingUserId === user.id || isCurrentUser}
                      title={
                        isCurrentUser
                          ? t("usersOwnStatusUnavailable")
                          : undefined
                      }
                      onClick={() => void toggleUserActive(user)}
                    >
                      {user.isActive
                        ? t("usersDeactivate")
                        : t("usersReactivate")}
                    </Button>
                  );
                },
              },
          ]}
          rows={users}
          getRowKey={(user) => user.id}
          busy={loadingUsers}
          emptyMessage={loadingUsers ? undefined : t("usersEmpty")}
          footer={
            <nav
              className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-3 max-[35rem]:flex-col max-[35rem]:items-stretch"
              aria-label={t("usersPagination")}
            >
                <label
                  className="flex items-center gap-2 text-sm text-muted max-[35rem]:justify-between"
                  htmlFor="users-page-size"
                >
                  <span>{t("usersItemsPerPage")}</span>
                  <Input
                    id="users-page-size"
                    className="h-9 w-16 text-center"
                    type="text"
                    inputMode="numeric"
                    value={pageSizeInput}
                    aria-label={t("usersItemsPerPage")}
                    onChange={(event) => setPageSizeInput(event.target.value)}
                    onBlur={commitPageSize}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") event.currentTarget.blur();
                    }}
                  />
                </label>
                <div className="flex items-center justify-center gap-2 max-[35rem]:self-center">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={t("usersPreviousPage")}
                    disabled={page === 1 || loadingUsers}
                    onClick={() => setPage((current) => current - 1)}
                  >
                    <ChevronLeft size={18} aria-hidden="true" />
                  </Button>
                  <span className="min-w-[4.5rem] text-center text-sm text-muted">
                    {t("catalogPage", { page })}
                  </span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={t("usersNextPage")}
                    disabled={!hasNextPage || loadingUsers}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    <ChevronRight size={18} aria-hidden="true" />
                  </Button>
                </div>
            </nav>
          }
        />

        {createModalOpen && (
          <dialog
            ref={createModalRef}
            className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[min(48rem,calc(100vw-2rem))] max-w-none overflow-y-auto rounded-md border border-border bg-surface p-0 text-foreground shadow-xl backdrop:bg-black/50"
            aria-labelledby="create-user-dialog-title"
            onClose={() => setCreateModalOpen(false)}
          >
            <form
              className="grid gap-3.5 p-5 [&_label]:grid [&_label]:gap-1.5 [&_label]:text-sm [&_label]:font-semibold [&_label]:text-foreground"
              onSubmit={submit}
            >
              <header className="flex items-start justify-between gap-4">
                <div>
                  <h2
                    className="m-0 text-base font-bold"
                    id="create-user-dialog-title"
                  >
                    {t("usersCreate")}
                  </h2>
                  <p className="mt-1 mb-0 text-sm text-muted">
                    {t("createUserDialogSubtitle")}
                  </p>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label={t("modalClose")}
                  onClick={() => setCreateModalOpen(false)}
                >
                  <X size={18} aria-hidden="true" />
                </Button>
              </header>
              <Tooltip type="warn" message={t("adminAccountDeletionWarning")} />
              <div className="grid grid-cols-2 gap-3.5 max-[35rem]:grid-cols-1">
                <label htmlFor="user-firstname">
                  {t("usersFirstname")}
                  <Input
                    id="user-firstname"
                    value={form.firstname}
                    onChange={(event) =>
                      update("firstname", event.target.value)
                    }
                    maxLength={100}
                    required
                  />
                </label>
                <label htmlFor="user-lastname">
                  {t("usersLastname")}
                  <Input
                    id="user-lastname"
                    value={form.lastname}
                    onChange={(event) => update("lastname", event.target.value)}
                    maxLength={100}
                    required
                  />
                </label>
              </div>
              <label htmlFor="user-email">
                {t("usersEmail")}
                <Input
                  id="user-email"
                  type="email"
                  autoComplete="off"
                  value={form.email}
                  onChange={(event) => update("email", event.target.value)}
                  required
                />
              </label>
              <label htmlFor="user-password">
                {t("usersPassword")}
                <Input
                  id="user-password"
                  type="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(event) => update("password", event.target.value)}
                  minLength={12}
                  required
                />
              </label>
              <label htmlFor="user-role">
                {t("usersRole")}
                <select
                  id="user-role"
                  className="h-10 w-full rounded-[0.3125rem] border border-control-border bg-surface px-3 text-foreground"
                  value={form.role}
                  onChange={(event) => update("role", event.target.value)}
                >
                  <option value="Subadmin">{t("roleSubadmin")}</option>
                  <option value="Admin">{t("roleAdmin")}</option>
                </select>
              </label>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateModalOpen(false)}
                >
                  {t("cancel")}
                </Button>
                <Button type="submit" disabled={saving}>
                  {t("usersCreate")}
                </Button>
              </div>
            </form>
          </dialog>
        )}
      </main>
    </AdminLayout>
  );
}
