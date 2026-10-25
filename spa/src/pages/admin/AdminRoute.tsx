import { useEffect, useState } from "react";
import { useAdminToast } from "../../components/admin/AdminToast";
import { CurrentUserContext } from "../../contexts/CurrentUser";
import i18n from "../../i18n";
import { ApiError } from "../../services/api-client";
import { clearSession, getCurrentUser } from "../../services/auth.api";
import type { CurrentUser } from "../../services/types";
import { AdminPage } from "./AdminPage";
import { Client360Page } from "./Client360Page";
import { InitialPasswordChangePage } from "./InitialPasswordChangePage";
import { LoginPage } from "./LoginPage";
import { RepairsPage } from "./RepairsPage";
import { SupportPage } from "./SupportPage";
import { UsersPage } from "./UsersPage";

export function AdminRoute() {
  const { showToast, showErrorToast } = useAdminToast();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [passwordChangeRequired, setPasswordChangeRequired] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setSessionChecked(true);
      return;
    }

    void getCurrentUser()
      .then((currentUser) => {
        if (currentUser.role !== "Admin" && currentUser.role !== "Subadmin") {
          showToast("error", i18n.t("toastError"), i18n.t("FORBIDDEN"));
          clearSession();
          return;
        }
        setUser(currentUser);
        if (currentUser.mustChangePassword) {
          setPasswordChangeRequired(true);
        }
      })
      .catch((error: unknown) => {
        if (
          error instanceof ApiError &&
          error.code === "PASSWORD_CHANGE_REQUIRED"
        ) {
          setPasswordChangeRequired(true);
          return;
        }
        showErrorToast(error, i18n.t("loginError"));
        clearSession();
      })
      .finally(() => {
        setSessionChecked(true);
      });
  }, [showErrorToast, showToast]);

  if (!sessionChecked)
    return (
      <div className="grid min-h-screen place-items-center text-muted">
        {i18n.t("checkingSession")}
      </div>
    );
  if (passwordChangeRequired) {
    return (
      <InitialPasswordChangePage
        onComplete={async () => {
          setUser(await getCurrentUser());
          setPasswordChangeRequired(false);
        }}
      />
    );
  }
  if (!user) return <LoginPage />;

  return (
    <CurrentUserContext.Provider value={user}>
      {renderPage(user)}
    </CurrentUserContext.Provider>
  );
}

function renderPage(user: CurrentUser) {
  switch (window.location.pathname.replace(/\/+$/, "")) {
    case "/admin/repairs":
      return <RepairsPage />;
    case "/admin/clients":
      return <Client360Page />;
    case "/admin/support":
      return <SupportPage />;
    case "/admin/users":
      return user.role === "Admin" ? <UsersPage /> : <AdminPage />;
    default:
      return <AdminPage />;
  }
}
