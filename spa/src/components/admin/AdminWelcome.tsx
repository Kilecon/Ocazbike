import { CalendarClock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/button";

export function AdminWelcome() {
  const { t } = useTranslation();

  return (
    <section
      className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 rounded-md border border-border bg-surface p-5 max-[560px]:items-start max-[560px]:flex-col"
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
          {t("adminTitle")}
        </h2>
        <p className="mt-1.5 mb-0 max-w-[540px] text-sm leading-6 text-muted">
          {t("adminIntro")}
        </p>
      </div>
      <Button asChild variant="default">
        <a href="/admin/schedules">
          <CalendarClock size={17} aria-hidden="true" />
          {t("manageHours")}
        </a>
      </Button>
    </section>
  );
}
