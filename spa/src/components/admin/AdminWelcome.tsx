import { useTranslation } from "react-i18next";
import { useCurrentUser } from "../../contexts/CurrentUser";

export function AdminWelcome() {
  const { t } = useTranslation();
  const currentUser = useCurrentUser();

  return (
    <section
      className="mx-auto max-w-[77.5rem] rounded-md border border-border bg-surface p-5"
      aria-labelledby="admin-welcome-title"
    >
      <div>
        <span className="text-[0.72rem] font-bold text-muted">
          {t("adminOverviewLabel")}
        </span>
        <h2
          className="m-0 text-base font-bold text-foreground"
          id="admin-welcome-title"
        >
          {t("adminTitle", { name: currentUser?.firstname ?? "" })}
        </h2>
        <p className="mt-1.5 mb-0 max-w-[33.75rem] text-sm leading-6 text-muted">
          {t("adminIntro")}
        </p>
      </div>
    </section>
  );
}
