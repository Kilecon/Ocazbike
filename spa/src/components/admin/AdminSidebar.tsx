import {
  CalendarClock,
  CircleHelp,
  LayoutDashboard,
  LogOut,
  Moon,
  ScanEye,
  SunMedium,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { clearSession, logout as logoutRequest } from "../../services/auth.api";
import { applyTheme, getPreferredTheme } from "../../theme";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

const menuItems = [
  { key: "adminDashboard", href: "/admin", icon: LayoutDashboard },
  { key: "adminHours", href: "/admin/schedules", icon: CalendarClock },
  { key: "adminRepairs", href: "/admin/repairs", icon: Wrench },
  { key: "adminView360", href: "/admin/clients", icon: ScanEye },
  { key: "adminSupport", href: "/admin/support", icon: CircleHelp },
] as const;

export function AdminSidebar() {
  const { t } = useTranslation();
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    getPreferredTheme(),
  );

  const logout = async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    if (refreshToken) {
      try {
        await logoutRequest(refreshToken);
      } catch {
        // The local session must still be cleared if the API is unavailable.
      }
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
      className="sticky top-0 flex h-screen min-h-screen w-[260px] shrink-0 flex-col bg-[var(--oz-admin-sidebar)] px-4 pt-6 pb-[18px] text-[var(--oz-on-dark)] dark:bg-gradient-to-b dark:from-[#0d1c1a] dark:to-[#132724] max-[720px]:static max-[720px]:h-auto max-[720px]:min-h-0 max-[720px]:w-full max-[720px]:p-[18px]"
      aria-label={t("adminNavigation")}
    >
      <a
        className="mb-6 flex w-full items-center gap-2.5 font-[var(--font-display)] text-[1.05rem] font-bold text-[var(--oz-on-dark)] no-underline"
        href="/"
        aria-label={t("adminBrand")}
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-[5px] bg-[var(--oz-mint)] text-[0.8rem] text-[var(--oz-admin-sidebar)]">
          N
        </span>
        <span>{t("adminBrand")}</span>
      </a>
      <div className="flex items-center gap-3 border-b border-[var(--oz-admin-sidebar-line)] pt-4 pb-5">
        <div
          className="grid size-[42px] shrink-0 place-items-center rounded-full bg-[var(--oz-orange)] text-[0.8rem] font-bold text-[var(--oz-avatar-foreground)]"
          aria-hidden="true"
        >
          MC
        </div>
        <div>
          <p className="m-0 text-[0.9rem] font-semibold">
            {t("adminAccountName")}
          </p>
          <p className="mt-1 mb-0 text-[0.68rem] text-[var(--oz-sidebar-muted)]">
            {t("adminLastLogin")}
          </p>
        </div>
      </div>
      <nav className="flex-1 py-5 max-[720px]:py-[14px]">
        <p className="mx-3 mt-0 mb-2 text-[0.7rem] font-bold text-[var(--oz-sidebar-muted)]">
          {t("adminWorkspace")}
        </p>
        <ul className="m-0 grid list-none gap-1 p-0 max-[720px]:grid-cols-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.href
              ? window.location.pathname === item.href
              : false;
            const content = (
              <>
                <Icon
                  className="size-[18px] shrink-0 text-[var(--oz-mint)]"
                  aria-hidden="true"
                />
                <span>{t(item.key)}</span>
                {!item.href && (
                  <Badge
                    className="ml-auto border-[var(--oz-admin-sidebar-line)] px-[7px] text-[0.62rem] leading-[1.6] text-[var(--oz-on-dark)]"
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
                    className={`box-border flex min-h-11 w-full items-center gap-2.5 rounded-[5px] px-3 py-[9px] text-sm text-[var(--oz-sidebar-text)] no-underline transition-colors duration-150 hover:bg-[var(--oz-admin-sidebar-hover)] hover:text-[var(--oz-on-dark)] ${isActive ? "bg-[var(--oz-admin-sidebar-hover)] text-[var(--oz-on-dark)] shadow-[inset_3px_0_var(--oz-orange)]" : ""}`}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {content}
                  </a>
                ) : (
                  <span className="box-border flex min-h-11 w-full cursor-default items-center gap-2.5 rounded-[5px] px-3 py-[9px] text-sm text-[var(--oz-sidebar-muted)]">
                    {content}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="flex items-center gap-2.5">
        <Button
          type="button"
          variant="outline"
          aria-label={
            theme === "dark" ? t("themeToggleLight") : t("themeToggleDark")
          }
          aria-pressed={theme === "dark"}
          onClick={toggleTheme}
        >
          {theme === "dark" ? (
            <SunMedium size={16} aria-hidden="true" />
          ) : (
            <Moon size={16} aria-hidden="true" />
          )}
        </Button>
        <Button
          className="w-full justify-start"
          variant="outline"
          type="button"
          onClick={() => void logout()}
        >
          <LogOut size={16} aria-hidden="true" />
          {t("logout")}
        </Button>
      </div>
    </aside>
  );
}
