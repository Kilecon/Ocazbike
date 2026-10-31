import {
  ArrowLeftRight,
  Bike,
  CircleHelp,
  LayoutDashboard,
  LogOut,
  Moon,
  ScanEye,
  Settings,
  ShoppingBag,
  SunMedium,
  Users,
  Wrench,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getFullName,
  getInitials,
  useCurrentUser,
} from "../../contexts/CurrentUser";
import { logout as logoutRequest } from "../../services/auth.api";
import {
  getOperationCounts,
  OPERATIONS_CHANGED_EVENT,
} from "../../services/operations.api";
import type { BillingOperationCountsDTO } from "../../services/types";
import { applyTheme, getPreferredTheme } from "../../theme";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { useAdminToast } from "./AdminToast";

const menuItems = [
  { key: "adminDashboard", href: "/admin", icon: LayoutDashboard },
  { key: "adminRepairs", href: "/admin/repairs", icon: Wrench, type: "repair" },
  { key: "adminSales", href: "/admin/sales", icon: ShoppingBag, type: "sale" },
  {
    key: "adminBuybacks",
    href: "/admin/buybacks",
    icon: ArrowLeftRight,
    type: "purchase",
  },
  { key: "adminRentals", href: "/admin/rentals", icon: Bike, type: "rental" },
  { key: "adminView360", href: "/admin/clients", icon: ScanEye },
  { key: "adminSupport", href: "/admin/support", icon: CircleHelp },
] as const;

const adminMenuItems = [
  { key: "adminUsers", href: "/admin/users", icon: Users },
  { key: "adminSettings", href: "/admin/settings", icon: Settings },
] as const;

export function AdminSidebar() {
  const { t } = useTranslation();
  const { showErrorToast } = useAdminToast();
  const [counts, setCounts] = useState<BillingOperationCountsDTO | null>(null);
  useEffect(() => {
    let active = true;
    let generation = 0;
    const reload = () => {
      const request = ++generation;
      void getOperationCounts()
        .then((result) => {
          if (active && request === generation) setCounts(result);
        })
        .catch((error: unknown) => {
          if (active && request === generation) {
            setCounts(null);
            showErrorToast(error, t("operationCountsLoadError"));
          }
        });
    };
    reload();
    window.addEventListener(OPERATIONS_CHANGED_EVENT, reload);
    window.addEventListener("focus", reload);
    return () => {
      active = false;
      window.removeEventListener(OPERATIONS_CHANGED_EVENT, reload);
      window.removeEventListener("focus", reload);
    };
  }, [showErrorToast, t]);
  const currentUser = useCurrentUser();
  const visibleMenuItems =
    currentUser?.role === "Admin"
      ? [...menuItems, ...adminMenuItems]
      : menuItems;
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    getPreferredTheme(),
  );

  const logout = async () => {
    try {
      await logoutRequest();
    } catch {
      // Cookies are HttpOnly, so only the API can clear them.
    }
    window.location.assign("/admin");
  };

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    applyTheme(nextTheme);
  };

  return (
    <aside
      className="sticky top-0 flex h-dvh min-h-0 w-[16.25rem] shrink-0 flex-col overflow-y-auto overscroll-contain bg-[var(--oz-admin-sidebar)] px-4 pt-6 pb-[1.125rem] text-[var(--oz-on-dark)] dark:bg-gradient-to-b dark:from-[#0d1c1a] dark:to-[#132724] max-[45rem]:static max-[45rem]:grid max-[45rem]:h-auto max-[45rem]:min-h-0 max-[45rem]:w-full max-[45rem]:grid-cols-[minmax(0,1fr)_auto] max-[45rem]:items-center max-[45rem]:gap-x-4 max-[45rem]:gap-y-3 max-[45rem]:overflow-visible max-[45rem]:p-4"
      aria-label={t("adminNavigation")}
    >
      <a
        className="mb-6 flex w-full min-w-0 items-center gap-2.5 font-[var(--font-display)] text-[1.05rem] font-bold text-[var(--oz-on-dark)] no-underline max-[45rem]:mb-0"
        href="/admin"
        aria-label={t("adminBrand")}
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-[0.3125rem] bg-[var(--oz-mint)] text-[0.8rem] text-[var(--oz-admin-sidebar)]">
          O
        </span>
        <span>{t("adminBrand")}</span>
      </a>
      <div className="flex min-w-0 flex-col items-start gap-8 border-b border-[var(--oz-admin-sidebar-line)] pt-4 pb-5 max-[45rem]:items-end max-[45rem]:justify-self-end max-[45rem]:border-0 max-[45rem]:p-0">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="grid size-[2.625rem] shrink-0 place-items-center rounded-full bg-[var(--oz-orange)] text-[0.8rem] font-bold text-[var(--oz-avatar-foreground)] max-[45rem]:size-9"
            aria-hidden="true"
          >
            {getInitials(currentUser)}
          </div>
          <div className="min-w-0 max-[30rem]:hidden">
            <p className="m-0 truncate text-[0.9rem] font-semibold">
              {getFullName(currentUser)}
            </p>
            <p className="mt-1 mb-0 text-[0.68rem] text-[var(--oz-sidebar-muted)]">
              {currentUser ? t(`role${currentUser.role}`) : ""}
            </p>
          </div>
        </div>
        <Button
          className="min-h-9 px-3 pb-1 text-[var(--oz-sidebar-text)] hover:bg-[var(--oz-admin-sidebar-hover)] max-[30rem]:size-11 max-[30rem]:px-0"
          type="button"
          variant="ghost"
          aria-label={t("logout")}
          title={t("logout")}
          onClick={() => void logout()}
        >
          <LogOut size={16} aria-hidden="true" />
          <span className="max-[30rem]:sr-only">{t("logout")}</span>
        </Button>
      </div>
      <nav className="flex-1 py-5 max-[45rem]:col-span-full max-[45rem]:py-0">
        <div className="mb-2 flex items-center justify-between px-3">
          <p className="m-0 text-[0.7rem] font-bold text-[var(--oz-sidebar-muted)]">
            {t("adminWorkspace")}
          </p>
          <button
            className="grid size-9 place-items-center rounded-[0.3125rem] text-[var(--oz-sidebar-text)] transition-colors hover:bg-[var(--oz-admin-sidebar-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--oz-mint)]"
            type="button"
            aria-label={
              theme === "dark" ? t("themeToggleLight") : t("themeToggleDark")
            }
            aria-pressed={theme === "dark"}
            title={
              theme === "dark" ? t("themeToggleLight") : t("themeToggleDark")
            }
            onClick={toggleTheme}
          >
            {theme === "dark" ? (
              <SunMedium size={16} aria-hidden="true" />
            ) : (
              <Moon size={16} aria-hidden="true" />
            )}
          </button>
        </div>
        <ul className="m-0 grid list-none gap-1 p-0 max-[45rem]:grid-cols-2 max-[30rem]:grid-cols-1">
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              window.location.pathname === item.href ||
              (item.href !== "/admin" &&
                window.location.pathname.startsWith(`${item.href}/`));

            return (
              <li
                key={item.key}
                className={`flex items-center rounded-[0.3125rem] ${isActive ? "bg-[var(--oz-admin-sidebar-hover)] shadow-[inset_0.1875rem_0_var(--oz-orange)]" : ""}`}
              >
                <a
                  className="box-border flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-[0.3125rem] py-[0.5625rem] pl-3 pr-1 text-sm text-[var(--oz-sidebar-text)] no-underline transition-colors duration-150 hover:bg-[var(--oz-admin-sidebar-hover)] hover:text-[var(--oz-on-dark)]"
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon
                    className="size-[1.125rem] shrink-0 text-[var(--oz-mint)]"
                    aria-hidden="true"
                  />
                  <span>{t(item.key)}</span>
                </a>
                {"type" in item ? (
                  <OperationStatusCounts
                    href={item.href}
                    counts={counts?.[item.type] ?? null}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

export function OperationStatusCounts({
  href,
  counts,
}: {
  href: string;
  counts: BillingOperationCountsDTO["repair"] | null;
}) {
  const { t } = useTranslation();
  const selectedStatus = new URLSearchParams(window.location.search).get(
    "status",
  );
  return (
    <ul className="m-0 flex shrink-0 list-none items-center gap-1 py-1 pr-2 pl-0">
      {(["pending", "in_progress", "payment_pending"] as const).map(
        (status) => (
          <li key={status}>
            <a
              href={`${href}?status=${status}`}
              aria-label={
                counts
                  ? t("operationStatusCount", {
                      count: counts[status],
                      status: t(`status_${status}`),
                    })
                  : `${t(`status_${status}`)} : ${t("operationCountsUnavailable")}`
              }
              title={t(`status_${status}`)}
              aria-current={
                window.location.pathname === href && selectedStatus === status
                  ? "page"
                  : undefined
              }
              className="inline-flex min-h-8 items-center rounded-full no-underline aria-[current=page]:ring-2 aria-[current=page]:ring-[var(--oz-on-dark)]"
            >
              <Badge
                className={`min-h-6 min-w-6 justify-center rounded-full px-1.5 text-xs tabular-nums ${status === "pending" ? "border-amber-300 bg-amber-100 text-amber-950" : status === "in_progress" ? "border-emerald-300 bg-emerald-100 text-emerald-950" : "border-orange-300 bg-orange-100 text-orange-950"}`}
                variant="outline"
              >
                {counts ? counts[status] : "—"}
              </Badge>
            </a>
          </li>
        ),
      )}
    </ul>
  );
}
