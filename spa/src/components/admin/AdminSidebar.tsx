import {
  CircleHelp,
  LayoutDashboard,
  LogOut,
  Moon,
  ScanEye,
  SunMedium,
  Users,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getFullName,
  getInitials,
  useCurrentUser,
} from "../../contexts/CurrentUser";
import { clearSession, logout as logoutRequest } from "../../services/auth.api";
import { applyTheme, getPreferredTheme } from "../../theme";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

const menuItems = [
  { key: "adminDashboard", href: "/admin", icon: LayoutDashboard },
  { key: "adminRepairs", href: "/admin/repairs", icon: Wrench },
  { key: "adminView360", href: "/admin/clients", icon: ScanEye },
  { key: "adminSupport", href: "/admin/support", icon: CircleHelp },
] as const;

const adminMenuItems = [
  { key: "adminUsers", href: "/admin/users", icon: Users },
] as const;

export function AdminSidebar() {
  const { t } = useTranslation();
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
      // The local session must still be cleared if the API is unavailable.
    }
    clearSession();
    window.location.assign("/");
  };

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    applyTheme(nextTheme);
  };

  return (
    <aside
      className="sticky top-0 flex h-screen min-h-screen w-[16.25rem] shrink-0 flex-col bg-[var(--oz-admin-sidebar)] px-4 pt-6 pb-[1.125rem] text-[var(--oz-on-dark)] dark:bg-gradient-to-b dark:from-[#0d1c1a] dark:to-[#132724] max-[45rem]:static max-[45rem]:grid max-[45rem]:h-auto max-[45rem]:min-h-0 max-[45rem]:w-full max-[45rem]:grid-cols-[minmax(0,1fr)_auto] max-[45rem]:items-center max-[45rem]:gap-x-4 max-[45rem]:gap-y-3 max-[45rem]:p-4"
      aria-label={t("adminNavigation")}
    >
      <a
        className="mb-6 flex w-full min-w-0 items-center gap-2.5 font-[var(--font-display)] text-[1.05rem] font-bold text-[var(--oz-on-dark)] no-underline max-[45rem]:mb-0"
        href="/"
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
            const isActive = item.href
              ? window.location.pathname === item.href
              : false;
            const content = (
              <>
                <Icon
                  className="size-[1.125rem] shrink-0 text-[var(--oz-mint)]"
                  aria-hidden="true"
                />
                <span>{t(item.key)}</span>
                {!item.href && (
                  <Badge
                    className="ml-auto border-[var(--oz-admin-sidebar-line)] px-[0.4375rem] text-[0.62rem] leading-[1.6] text-[var(--oz-on-dark)]"
                    variant="outline"
                  >
                    {t("comingSoon")}
                  </Badge>
                )}
              </>
            );

            return (
              <li key={item.key}>
                {item.href ? (
                  <a
                    className={`box-border flex min-h-11 w-full items-center gap-2.5 rounded-[0.3125rem] px-3 py-[0.5625rem] text-sm text-[var(--oz-sidebar-text)] no-underline transition-colors duration-150 hover:bg-[var(--oz-admin-sidebar-hover)] hover:text-[var(--oz-on-dark)] ${isActive ? "bg-[var(--oz-admin-sidebar-hover)] text-[var(--oz-on-dark)] shadow-[inset_0.1875rem_0_var(--oz-orange)]" : ""}`}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {content}
                  </a>
                ) : (
                  <span className="box-border flex min-h-11 w-full cursor-default items-center gap-2.5 rounded-[0.3125rem] px-3 py-[0.5625rem] text-sm text-[var(--oz-sidebar-muted)]">
                    {content}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
