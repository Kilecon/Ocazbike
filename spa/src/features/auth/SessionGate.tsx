import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { PageLoader } from "@/shared/ui/PageLoader";
import { CurrentUserContext } from "./CurrentUser";
import { InitialPasswordChangePage } from "./InitialPasswordChangePage";
import { LoginPage } from "./LoginPage";
import { useRefreshSession, useSession } from "./session";

/** Renders its children only for an authenticated staff member. */
export function SessionGate({ children }: Readonly<{ children: ReactNode }>) {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const refreshSession = useRefreshSession();

  if (!session) return <PageLoader label="checkingSession" />;
  if (session.status === "password-change-required") {
    return (
      <InitialPasswordChangePage
        onComplete={async () => {
          await refreshSession();
        }}
      />
    );
  }
  if (session.status === "anonymous") {
    return (
      <LoginPage initialError={session.error ? t(session.error) : undefined} />
    );
  }
  return (
    <CurrentUserContext.Provider value={session.user}>
      {children}
    </CurrentUserContext.Provider>
  );
}
