import { Funnel, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Grid } from "../../../components/ui/Grid";
import { useCurrentUser } from "../../../contexts/CurrentUser";
import { formatDateTime } from "../../../lib/date";
import { primitivesColors } from "../../../lib/tokens";
import type { ManagedUser } from "../../../services/types";

export function UsersGrid({
  users,
  loading,
  activeOnly,
  onStatusFilterChange,
  onCreate,
  onToggleUserActive,
  updatingUserId,
  page,
  pageSize,
  hasNextPage,
  onPageChange,
  onPageSizeChange,
  onClearFilters,
}: {
  users: ManagedUser[];
  loading: boolean;
  activeOnly: boolean;
  onStatusFilterChange: (activeOnly: boolean) => void;
  onCreate: () => void;
  onToggleUserActive: (user: ManagedUser) => void;
  updatingUserId: number | null;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onClearFilters: () => void;
}) {
  const { t, i18n } = useTranslation();
  const currentUser = useCurrentUser();
  const [statusFilterOpen, setStatusFilterOpen] = useState(false);
  const statusFilterRef = useRef<HTMLDivElement>(null);

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
    setStatusFilterOpen(false);
    onStatusFilterChange(nextActiveOnly);
  };

  return (
    <Grid
      title={t("userListGridTitle")}
      subtitle={t("userListGridsubTitle")}
      actions={[
        <Button key="create-user" type="button" onClick={onCreate}>
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
                onRemove: onClearFilters,
              },
            ]
          : []
      }
      activeFiltersLabel={t("activeFilters")}
      activeFiltersEmptyMessage={t("noActiveFilters")}
      clearFiltersLabel={t("clearFilters")}
      onClearFilters={onClearFilters}
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
                      <Funnel className="size-4 shrink-0" aria-hidden="true" />
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
                      <Funnel className="size-4 shrink-0" aria-hidden="true" />
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
              : formatDateTime(user.lastLoginAtEpochMs, i18n.language),
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
                  isCurrentUser ? t("usersOwnStatusUnavailable") : undefined
                }
                onClick={() => onToggleUserActive(user)}
              >
                {user.isActive ? t("usersDeactivate") : t("usersReactivate")}
              </Button>
            );
          },
        },
      ]}
      rows={users}
      getRowKey={(user) => user.id}
      busy={loading}
      emptyMessage={loading ? undefined : t("usersEmpty")}
      pagination={{
        page,
        pageSize,
        hasNextPage,
        onPageChange,
        onPageSizeChange,
      }}
    />
  );
}
