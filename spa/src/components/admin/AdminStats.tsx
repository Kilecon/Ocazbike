import { CalendarClock, CalendarOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ClosureDTO, ScheduleDTO } from "../../services/types";
import { Card } from "../ui/card";

export function AdminStats({
  schedule,
  closures,
  loading,
}: {
  schedule: ScheduleDTO | null;
  closures: ClosureDTO[];
  loading: boolean;
}) {
  const { t } = useTranslation();
  const openSlots = schedule?.slots.length ?? 0;
  const activeClosures = closures.filter(
    (closure) => !closure.isExpired,
  ).length;
  const stats = [
    { value: String(openSlots), label: "adminOpenSlots", icon: CalendarClock },
    {
      value: String(activeClosures),
      label: "adminActiveClosures",
      icon: CalendarOff,
    },
  ] as const;

  return (
    <section aria-labelledby="admin-snapshot-title" aria-busy={loading}>
      <div className="mx-auto mt-6 mb-2.5 flex max-w-[1240px] items-center justify-between gap-4">
        <h2
          className="m-0 text-base font-bold text-foreground"
          id="admin-snapshot-title"
        >
          {t("adminSnapshot")}
        </h2>
        <span className="text-[0.72rem] text-muted">{t("adminUpdated")}</span>
      </div>
      <ul className="mx-auto mt-0 mb-0 grid max-w-[1240px] list-none grid-cols-2 gap-3 p-0">
        {stats.map((stat) => (
          <Card
            asChild
            className="grid min-h-[110px] grid-cols-[42px_1fr] grid-rows-[auto_auto] content-center items-center gap-x-3 p-[18px]"
            key={stat.label}
          >
            <li>
              <stat.icon
                className="row-span-2 size-9 rounded-[5px] bg-surface-muted p-2 text-primary"
                aria-hidden="true"
              />
              <strong className="text-[1.3rem] leading-tight text-foreground">
                {loading ? "–" : stat.value}
              </strong>
              <span className="text-[0.8rem] text-muted">{t(stat.label)}</span>
            </li>
          </Card>
        ))}
      </ul>
    </section>
  );
}
