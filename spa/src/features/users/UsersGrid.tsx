import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCurrentUser } from "@/features/auth/CurrentUser";
import { formatDateTime } from "@/shared/lib/date";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { Grid } from "@/shared/ui/Grid";
import type { UserStatus } from "./api";
import type { ManagedUser } from "./types";

export function UsersGrid({
  users,
  loading,
  status,
  onCreate,
  onToggleUserActive,
  updatingUserId,
  page,
  pageSize,
  hasNextPage,
  onPageChange,
  onPageSizeChange,
}: Readonly<{
  users: readonly ManagedUser[];
  loading: boolean;
  status: UserStatus;
  onCreate: () => void;
  onToggleUserActive: (user: ManagedUser) => void;
  updatingUserId: number | null;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}>) {
  const { t, i18n } = useTranslation();
  const currentUser = useCurrentUser();
  return (
    <Grid
      title={t("userListGridTitle")}
      subtitle={t("userListGridsubTitle")}
      actions={[
        <Button key="create-user" type="button" onClick={onCreate}>
          <Plus size="1.0625rem" aria-hidden="true" />
          {t("createUserButton")}
        </Button>,
      ]}
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
            <Badge color="draft">{t(`role${user.role}`)}</Badge>
          ),
        },
        ...(status === "all"
          ? [
              {
                key: "status",
                title: t("usersStatus"),
                render: (user: ManagedUser) =>
                  user.isActive ? t("usersActive") : t("usersInactive"),
              },
            ]
          : []),
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
