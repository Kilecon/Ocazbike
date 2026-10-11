import type { ReactNode } from "react";
import { AdminSidebar } from "../components/admin/AdminSidebar";

export function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-surface-muted dark:bg-[var(--oz-page-bg)] max-[720px]:block motion-reduce:[&_*]:scroll-auto motion-reduce:[&_*]:animate-none motion-reduce:[&_*]:transition-none">
      <AdminSidebar />
      {children}
    </div>
  );
}
