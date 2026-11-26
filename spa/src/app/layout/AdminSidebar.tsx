import { Link, useRouterState } from "@tanstack/react-router";
import {
  ArrowLeftRight,
  Bike,
  CircleHelp,
  LogOut,
  Moon,
  ScanEye,
  Settings,
  ShoppingBag,
  SunMedium,
  Users,
  Wrench,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  getFullName,
  getInitials,
  useCurrentUser,
} from "@/features/auth/CurrentUser";
import { useLogout } from "@/features/auth/session";
import { useOperationCountsQuery } from "@/features/operations/queries";
import type { OperationSection } from "@/features/operations/sections";
import type { BillingOperationCountsDTO } from "@/features/operations/types";
import { useTheme } from "@/shared/theme/theme";
import { Badge } from "@/shared/ui/Badge";
import { useErrorToast } from "@/shared/ui/useErrorToast";
import logoUrl from "../../../public/assets/ocazbike-logo.png";

const viewItem = {
  key: "adminView360",
  to: "/admin/clients",
  icon: ScanEye,
} as const;

const menuItems = [
  { key: "adminRepairs", section: "repairs", icon: Wrench, type: "repair" },
  { key: "adminSales", section: "sales", icon: ShoppingBag, type: "sale" },
  {
    key: "adminBuybacks",
    section: "buybacks",
    icon: ArrowLeftRight,
    type: "purchase",
  },
  { key: "adminRentals", section: "rentals", icon: Bike, type: "rental" },
] as const;

const utilityMenuItems = [
  { key: "adminSupport", to: "/admin/support", icon: CircleHelp },
  {
    key: "adminSettings",
    to: "/admin/settings",
    icon: Settings,
    adminOnly: true,
  },
  { key: "adminUsers", to: "/admin/users", icon: Users, adminOnly: true },
] as const;

type SidebarItemDefinition =
  | typeof viewItem
  | (typeof menuItems)[number]
  | (typeof utilityMenuItems)[number];

function SidebarItem({
  item,
  counts,
}: Readonly<{
  item: SidebarItemDefinition;
  counts: BillingOperationCountsDTO | null;
}>) {
  const { t } = useTranslation();
  const Icon = item.icon;
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const href = "section" in item ? `/admin/${item.section}` : item.to;
  const isActive = pathname === href || pathname.startsWith(`${href}/`);
  const linkProps =
    "section" in item
      ? ({ to: "/admin/$section", params: { section: item.section } } as const)
      : ({ to: item.to } as const);

  return (
    <li
      className={`oz-sidebar-item flex items-center rounded-l-[0.3125rem] pr-5 max-[45rem]:rounded-r-[0.3125rem] ${isActive ? "is-active" : ""}`}
    >
      <Link
        {...linkProps}
        className="box-border flex min-h-10 min-w-0 flex-1 items-center gap-2.5 rounded-[0.3125rem] py-2 pl-2.5 pr-1 text-sm no-underline transition-colors duration-150"
        activeOptions={{ includeSearch: false }}
      >
        <Icon
          className="oz-sidebar-icon size-[1.125rem] shrink-0"
          aria-hidden="true"
        />
        <span>{t(item.key)}</span>
      </Link>
      {"section" in item ? (
        <OperationStatusCounts
          section={item.section}
          counts={counts?.[item.type] ?? null}
        />
      ) : null}
    </li>
  );
}

export function AdminSidebar() {
  const { t } = useTranslation();
  const brandName = t("adminBrand").toUpperCase();
  const countsQuery = useOperationCountsQuery();
  const counts = countsQuery.data ?? null;
  useErrorToast(countsQuery.error, t("operationCountsLoadError"));
  const currentUser = useCurrentUser();
  const visibleUtilityItems = utilityMenuItems.filter(
    (item) => !("adminOnly" in item) || currentUser?.role === "Admin",
  );
  const { theme, toggleTheme } = useTheme();

  const logout = useLogout();

  return (
    <aside
      className="oz-admin-sidebar sticky top-0 flex h-dvh min-h-0 w-60 shrink-0 flex-col overflow-y-auto overscroll-contain text-[var(--oz-on-dark)] max-[45rem]:static max-[45rem]:h-auto max-[45rem]:min-h-0 max-[45rem]:w-full max-[45rem]:overflow-visible"
      aria-label={t("adminNavigation")}
    >
      <Link
        className="flex h-20 w-full shrink-0 items-center gap-2.5 border-b border-[var(--oz-admin-sidebar-line)] px-5 font-[var(--font-display)] text-xl font-bold text-[var(--oz-on-dark)] no-underline"
        to="/admin"
        activeOptions={{ exact: true, includeSearch: false }}
        aria-label={brandName}
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white">
          <img
            className="size-10 object-contain"
            src={logoUrl}
            alt=""
            aria-hidden="true"
          />
        </span>
        <span>{brandName}</span>
      </Link>
      <nav
        className="flex-1 pl-5 pt-5 max-[45rem]:pr-5"
        aria-label={t("adminNavigation")}
      >
        <ul className="m-0 list-none p-0">
          <SidebarItem item={viewItem} counts={counts} />
        </ul>
        <p className="mt-5 mb-2 px-2.5 text-xs font-bold text-[var(--oz-sidebar-muted)]">
          {t("adminWorkspaces")}
        </p>
        <ul className="m-0 grid list-none gap-1 p-0 max-[45rem]:grid-cols-2 max-[30rem]:grid-cols-1">
          {menuItems.map((item) => (
            <SidebarItem key={item.key} item={item} counts={counts} />
          ))}
        </ul>
      </nav>
      <nav
        className="pl-5 pb-3 max-[45rem]:pr-5"
        aria-label={t("adminSettings")}
      >
        <ul className="m-0 grid list-none gap-2 p-0">
          {visibleUtilityItems.map((item) => (
            <SidebarItem key={item.key} item={item} counts={counts} />
          ))}
        </ul>
      </nav>
      <div className="flex min-h-16 shrink-0 items-center justify-between gap-3 px-7">
        <span className="text-sm">
          {theme === "dark" ? t("themeLabelDark") : t("themeLabelLight")}
        </span>
        <button
          className="oz-theme-switch shrink-0 oz-focus-ring"
          type="button"
          role="switch"
          aria-label={
            theme === "dark" ? t("themeToggleLight") : t("themeToggleDark")
          }
          aria-checked={theme === "dark"}
          title={
            theme === "dark" ? t("themeToggleLight") : t("themeToggleDark")
          }
          onClick={toggleTheme}
        >
          <span className="oz-theme-switch-thumb">
            {theme === "dark" ? (
              <Moon className="size-3.5" aria-hidden="true" />
            ) : (
              <SunMedium className="size-3.5" aria-hidden="true" />
            )}
          </span>
        </button>
      </div>
      <div className="flex min-h-20 shrink-0 items-center gap-3 border-t border-[var(--oz-admin-sidebar-line)] px-5">
        <div className="oz-sidebar-avatar grid size-10 shrink-0 place-items-center rounded-full text-xs font-medium">
          {getInitials(currentUser)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="m-0 truncate text-sm">{getFullName(currentUser)}</p>
          <p className="m-0 text-xs text-[var(--oz-sidebar-muted)]">
            {currentUser ? t(`role${currentUser.role}`) : ""}
          </p>
        </div>
        <button
          className="grid size-9 shrink-0 place-items-center rounded text-[var(--oz-sidebar-text)] transition-colors hover:bg-[var(--oz-admin-sidebar-hover)] oz-focus-ring"
          type="button"
          aria-label={t("logout")}
          title={t("logout")}
          onClick={() => void logout()}
        >
          <LogOut size="1.0625rem" aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}

export function OperationStatusCounts({
  section,
  counts,
}: Readonly<{
  section: OperationSection;
  counts: BillingOperationCountsDTO["repair"] | null;
}>) {
  const { t } = useTranslation();
  const detailsRef = useRef<HTMLDetailsElement>(null);

  const total = counts
    ? counts.pending + counts.in_progress + counts.payment_pending
    : null;

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      const details = detailsRef.current;
      if (
        details?.open &&
        event.target instanceof Node &&
        !details.contains(event.target)
      ) {
        details.open = false;
      }
    };
    document.addEventListener("click", closeOnOutsideClick, true);
    return () =>
      document.removeEventListener("click", closeOnOutsideClick, true);
  }, []);

  return (
    <details ref={detailsRef} className="relative shrink-0">
      <summary
        className="grid size-8 cursor-pointer list-none place-items-center rounded-full [&::-webkit-details-marker]:hidden"
        aria-label={
          counts
            ? t("operationCountsSummary", {
                count: total,
                pending: counts.pending,
                inProgress: counts.in_progress,
                paymentPending: counts.payment_pending,
              })
            : t("operationCountsUnavailable")
        }
        title={
          counts
            ? t("operationCountsSummary", {
                count: total,
                pending: counts.pending,
                inProgress: counts.in_progress,
                paymentPending: counts.payment_pending,
              })
            : t("operationCountsUnavailable")
        }
      >
        <Badge
          className="oz-sidebar-count min-h-7 min-w-7 px-1.5 text-xs tabular-nums"
          color="draft"
        >
          {total ?? "—"}
        </Badge>
      </summary>
      <ul className="absolute top-full right-0 z-30 m-0 grid min-w-40 list-none gap-1 rounded-md border border-border bg-surface p-2 text-foreground shadow-lg">
        {(["pending", "in_progress", "payment_pending"] as const).map(
          (status) => {
            const unavailableStatusLabel = [
              t(`status_${status}`),
              t("operationCountsUnavailable"),
            ].join(" : ");
            return (
              <li key={status}>
                <Link
                  to="/admin/$section"
                  params={{ section }}
                  search={{ status }}
                  activeOptions={{ exact: true }}
                  aria-label={
                    counts
                      ? t("operationStatusCount", {
                          count: counts[status],
                          status: t(`status_${status}`),
                        })
                      : unavailableStatusLabel
                  }
                  className="flex min-h-9 items-center justify-between gap-3 rounded px-2 text-sm no-underline hover:bg-surface-muted aria-[current=page]:bg-surface-muted"
                >
                  <span>{t(`status_${status}`)}</span>
                  <Badge
                    className="min-h-6 min-w-6 px-1.5 text-xs tabular-nums"
                    color={status === "in_progress" ? "info" : "warning"}
                  >
                    {counts ? counts[status] : "—"}
                  </Badge>
                </Link>
              </li>
            );
          },
        )}
      </ul>
    </details>
  );
}
