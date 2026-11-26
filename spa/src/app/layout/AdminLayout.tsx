import { Outlet } from "@tanstack/react-router";
import { AdminSidebar } from "./AdminSidebar";

export function AdminLayout() {
  return (
    <div className="oz-admin-layout flex min-h-screen max-[45rem]:block motion-reduce:[&_*]:scroll-auto motion-reduce:[&_*]:animate-none motion-reduce:[&_*]:transition-none">
      <AdminSidebar />
      <Outlet />
    </div>
  );
}
