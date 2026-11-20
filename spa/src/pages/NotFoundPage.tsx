import { useTranslation } from "react-i18next";
import { Button } from "../components/ui/button";

export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <main
      aria-labelledby="not-found-title"
      className="grid min-h-screen place-items-center bg-surface p-6 text-foreground"
    >
      <div className="max-w-md text-center">
        <p className="m-0 text-sm font-semibold text-[var(--oz-orange)]">404</p>
        <h1
          className="mt-2 mb-0 font-[var(--font-display)] text-2xl leading-[1.2] font-bold"
          id="not-found-title"
        >
          {t("notFoundTitle")}
        </h1>
        <p className="mt-3 mb-6 text-sm leading-6 text-muted">
          {t("notFoundDescription")}
        </p>
        <Button asChild className="min-h-11 px-4 py-2">
          <a href="/admin">{t("notFoundBackToAdmin")}</a>
        </Button>
      </div>
    </main>
  );
}
