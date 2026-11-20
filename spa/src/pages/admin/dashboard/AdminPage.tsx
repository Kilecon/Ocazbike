import { ActivityPanel } from "../../../components/admin/ActivityPanel";
import { AdminHeader } from "../../../components/admin/AdminHeader";
import { AdminWelcome } from "../../../components/admin/AdminWelcome";
import { AdminLayout } from "../../../layouts/AdminLayout";

export function AdminPage() {
  return (
    <AdminLayout>
      <main
        className="mx-auto min-h-screen w-full min-w-0 max-w-[87.5rem] px-[clamp(1.25rem,4vw,3.5rem)] py-8 max-[45rem]:min-h-0 max-[45rem]:px-[1.125rem] max-[45rem]:pt-7 max-[45rem]:pb-10 [&_*:focus-visible]:outline-[0.1875rem] [&_*:focus-visible]:outline-offset-[0.1875rem] [&_*:focus-visible]:outline-[var(--oz-focus)]"
        aria-labelledby="admin-title"
      >
        <AdminHeader />
        <AdminWelcome />
        <div className="mx-auto mt-3 max-w-[77.5rem]">
          <ActivityPanel />
        </div>
      </main>
    </AdminLayout>
  );
}
