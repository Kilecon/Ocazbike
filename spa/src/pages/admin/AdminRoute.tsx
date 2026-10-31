import { LoaderCircle } from "lucide-react";
import { lazy, type ReactNode, Suspense, useEffect, useState } from "react";
import { useAdminToast } from "../../components/admin/AdminToast";
import { CurrentUserContext } from "../../contexts/CurrentUser";
import i18n from "../../i18n";
import { ApiError } from "../../services/api-client";
import { getCurrentUser, logout } from "../../services/auth.api";
import type { CurrentUser } from "../../services/types";

const AdminPage = lazy(() =>
  import("./dashboard/AdminPage").then((m) => ({ default: m.AdminPage })),
);
const Client360Page = lazy(() =>
  import("./clients/Client360Page").then((m) => ({
    default: m.Client360Page,
  })),
);
const ClientDetailPage = lazy(() =>
  import("./clients/ClientDetailPage").then((m) => ({
    default: m.ClientDetailPage,
  })),
);
const InitialPasswordChangePage = lazy(() =>
  import("./password-change/InitialPasswordChangePage").then((m) => ({
    default: m.InitialPasswordChangePage,
  })),
);
const LoginPage = lazy(() =>
  import("./login/LoginPage").then((m) => ({ default: m.LoginPage })),
);
const OperationsPage = lazy(() =>
  import("./operations/OperationsPage").then((m) => ({
    default: m.OperationsPage,
  })),
);
const OperationDocumentPage = lazy(() =>
  import("./operations/OperationDocumentPage").then((m) => ({
    default: m.OperationDocumentPage,
  })),
);
const SettingsPage = lazy(() =>
  import("./settings/SettingsPage").then((m) => ({
    default: m.SettingsPage,
  })),
);
const SupportPage = lazy(() =>
  import("./support/SupportPage").then((m) => ({ default: m.SupportPage })),
);
const UsersPage = lazy(() =>
  import("./users/UsersPage").then((m) => ({ default: m.UsersPage })),
);

function PageLoader() {
  return (
    <div
      aria-live="polite"
      className="grid min-h-screen place-items-center text-muted"
      role="status"
    >
      <span className="inline-flex items-center gap-2">
        <LoaderCircle aria-hidden="true" className="animate-spin" size={20} />
        {i18n.t("loading")}
      </span>
    </div>
  );
}

function LazyPage({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

export function AdminRoute() {
  const { showToast, showErrorToast } = useAdminToast();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [passwordChangeRequired, setPasswordChangeRequired] = useState(false);

  useEffect(() => {
    let active = true;
    void getCurrentUser()
      .then((currentUser) => {
        if (!active) return;
        if (currentUser.role !== "Admin" && currentUser.role !== "Subadmin") {
          showToast("error", i18n.t("toastError"), i18n.t("FORBIDDEN"));
          void logout().catch(() => {});
          return;
        }
        setUser(currentUser);
        if (currentUser.mustChangePassword) {
          setPasswordChangeRequired(true);
        }
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (
          error instanceof ApiError &&
          error.code === "PASSWORD_CHANGE_REQUIRED"
        ) {
          setPasswordChangeRequired(true);
          return;
        }
        if (error instanceof ApiError && error.status === 401) return;
        showErrorToast(error, i18n.t("loginError"));
      })
      .finally(() => {
        if (active) setSessionChecked(true);
      });

    return () => {
      active = false;
    };
  }, [showErrorToast, showToast]);

  if (!sessionChecked)
    return (
      <div className="grid min-h-screen place-items-center text-muted">
        {i18n.t("checkingSession")}
      </div>
    );
  if (passwordChangeRequired) {
    return (
      <LazyPage>
        <InitialPasswordChangePage
          onComplete={async () => {
            setUser(await getCurrentUser());
            setPasswordChangeRequired(false);
          }}
        />
      </LazyPage>
    );
  }
  if (!user)
    return (
      <LazyPage>
        <LoginPage />
      </LazyPage>
    );

  return (
    <CurrentUserContext.Provider value={user}>
      <LazyPage>{renderPage(user)}</LazyPage>
    </CurrentUserContext.Provider>
  );
}

function renderPage(user: CurrentUser) {
  const pathname = window.location.pathname.replace(/\/+$/, "");
  const documentMatch = pathname.match(
    /^\/admin\/(?:repairs|sales|buybacks|rentals)\/(\d+)\/documents\/(quote|invoice)$/,
  );
  if (documentMatch) {
    return (
      <OperationDocumentPage
        operationId={Number(documentMatch[1])}
        kind={documentMatch[2] === "quote" ? "quote" : "invoice"}
      />
    );
  }
  const operationMatch = pathname.match(
    /^\/admin\/(repairs|sales|buybacks|rentals)(?:\/\d+)?$/,
  );
  if (operationMatch) {
    const typeByPath = {
      repairs: "repair",
      sales: "sale",
      buybacks: "purchase",
      rentals: "rental",
    } as const;
    return (
      <OperationsPage
        type={typeByPath[operationMatch[1] as keyof typeof typeByPath]}
      />
    );
  }

  switch (pathname) {
    case "/admin/clients":
      return <Client360Page />;
    case "/admin/clients/new":
      return <Client360Page openCreate />;
    case "/admin/support":
      return <SupportPage />;
    case "/admin/users":
      return user.role === "Admin" ? <UsersPage /> : <AdminPage />;
    case "/admin/settings":
      return user.role === "Admin" ? <SettingsPage /> : <AdminPage />;
    default: {
      const clientMatch = window.location.pathname
        .replace(/\/+$/, "")
        .match(/^\/admin\/clients\/(\d+)$/);
      if (clientMatch) {
        return <ClientDetailPage clientId={Number(clientMatch[1])} />;
      }
      return <AdminPage />;
    }
  }
}
