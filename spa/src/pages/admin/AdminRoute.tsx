import { useEffect, useState } from "react";
import i18n from "../../i18n";
import { clearSession, getCurrentUser } from "../../services/auth.api";
import { AdminPage } from "./AdminPage";
import { Client360Page } from "./Client360Page";
import { LoginPage } from "./LoginPage";
import { RepairsPage } from "./RepairsPage";
import { SchedulesPage } from "./SchedulesPage";
import { SupportPage } from "./SupportPage";

export function AdminRoute() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setAuthorized(false);
      return;
    }

    void getCurrentUser()
      .then((user) => {
        if (user.role !== "admin") clearSession();
        setAuthorized(user.role === "admin");
      })
      .catch(() => {
        clearSession();
        setAuthorized(false);
      });
  }, []);

  if (authorized === null)
    return (
      <div className="grid min-h-screen place-items-center text-muted">
        {i18n.t("checkingSession")}
      </div>
    );
  if (!authorized) return <LoginPage />;

  switch (window.location.pathname.replace(/\/+$/, "")) {
    case "/admin/schedules":
      return <SchedulesPage />;
    case "/admin/repairs":
      return <RepairsPage />;
    case "/admin/clients":
      return <Client360Page />;
    case "/admin/support":
      return <SupportPage />;
    default:
      return <AdminPage />;
  }
}
