import type { ReactNode } from "react";
import { AdminLayout } from "../../../layouts/AdminLayout";

export function AdminPageShell({
  labelledBy,
  children,
}: {
  labelledBy: string;
  children: ReactNode;
}) {
  return (
    <AdminLayout>
      <main
        className="min-h-screen min-w-0 flex-1 p-[clamp(1.5rem,4vw,3.5rem)] max-[45rem]:min-h-0 max-[45rem]:px-4 max-[45rem]:pt-6 max-[45rem]:pb-10 [&_*:focus-visible]:outline-[0.1875rem] [&_*:focus-visible]:outline-offset-[0.1875rem] [&_*:focus-visible]:outline-[var(--oz-focus)]"
        aria-labelledby={labelledBy}
      >
        {children}
      </main>
    </AdminLayout>
  );
}
