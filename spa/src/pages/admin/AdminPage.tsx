import { useEffect, useState } from "react";
import { ActivityPanel } from "../../components/admin/ActivityPanel";
import { AdminHeader } from "../../components/admin/AdminHeader";
import { AdminStats } from "../../components/admin/AdminStats";
import { AdminWelcome } from "../../components/admin/AdminWelcome";
import { StatusPanel } from "../../components/admin/StatusPanel";
import { AdminLayout } from "../../layouts/AdminLayout";
import { ApiError } from "../../services/api-client";
import { getClosures } from "../../services/closures.api";
import { getSchedule } from "../../services/opening-hours.api";
import type { ClosureDTO, ScheduleDTO } from "../../services/types";

export function AdminPage() {
  const [schedule, setSchedule] = useState<ScheduleDTO | null>(null);
  const [closures, setClosures] = useState<ClosureDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void Promise.allSettled([getSchedule(), getClosures()])
      .then(([scheduleResult, closuresResult]) => {
        if (scheduleResult.status === "fulfilled")
          setSchedule(scheduleResult.value);
        if (
          scheduleResult.status === "rejected" &&
          !(
            scheduleResult.reason instanceof ApiError &&
            scheduleResult.reason.status === 404
          )
        )
          return;
        if (closuresResult.status === "fulfilled")
          setClosures(closuresResult.value.closures);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminLayout>
      <main
        className="mx-auto min-h-screen w-full min-w-0 max-w-[1400px] px-[clamp(20px,4vw,56px)] py-8 max-[720px]:min-h-0 max-[720px]:px-[18px] max-[720px]:pt-7 max-[720px]:pb-10 [&_*:focus-visible]:outline-[3px] [&_*:focus-visible]:outline-offset-[3px] [&_*:focus-visible]:outline-[var(--oz-focus)]"
        aria-labelledby="admin-title"
      >
        <AdminHeader />
        <AdminWelcome />
        <AdminStats schedule={schedule} closures={closures} loading={loading} />
        <div className="mx-auto mt-3 grid max-w-[1240px] grid-cols-2 gap-3 max-[900px]:grid-cols-1">
          <StatusPanel />
          <ActivityPanel />
        </div>
      </main>
    </AdminLayout>
  );
}
