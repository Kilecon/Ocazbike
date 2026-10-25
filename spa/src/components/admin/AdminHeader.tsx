import { useTranslation } from "react-i18next";

export function AdminHeader() {
  const { t } = useTranslation();

  return (
    <header className="mx-auto mb-6 flex max-w-[77.5rem] items-center justify-between gap-4">
      <div>
        <span className="text-[0.72rem] font-bold text-muted">
          {t("adminKicker")}
        </span>
        <h1
          className="mt-1 mb-0 font-[var(--font-display)] text-2xl leading-[1.2] font-bold text-foreground"
          id="admin-title"
        >
          {t("adminDashboard")}
        </h1>
      </div>
      <span className="self-start pt-[0.1875rem] text-[0.72rem] text-muted">
        2026
      </span>
    </header>
  );
}
