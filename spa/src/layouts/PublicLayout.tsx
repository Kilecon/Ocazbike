import { Clock3, MapPin, Menu, Moon, Phone, SunMedium, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import logo from "../../public/assets/ocazbike-logo.png";
import { Button } from "../components/ui/button";
import i18n, {
  changeLanguage,
  type SupportedLanguage,
  supportedLanguages,
} from "../i18n";
import { applyTheme, getPreferredTheme, getSystemTheme } from "../theme";

const navigation = [
  { href: "/#Presentation", label: "publicNavHome" },
  { href: "/#services", label: "publicNavServices" },
  { href: "/velo", label: "publicNavBikes" },
  { href: "/#reviews", label: "publicNavReviews" },
] as const;

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [languageError, setLanguageError] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    getPreferredTheme(),
  );
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const isCatalog = window.location.pathname.replace(/\/+$/, "") === "/velo";

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemThemeChange = () => {
      const storedTheme = window.localStorage.getItem("theme");
      if (storedTheme === "light" || storedTheme === "dark") {
        return;
      }
      setTheme(getSystemTheme());
    };

    mediaQuery.addEventListener("change", onSystemThemeChange);
    return () => mediaQuery.removeEventListener("change", onSystemThemeChange);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  const handleLanguageChange = async (language: SupportedLanguage) => {
    setLanguageError(false);
    try {
      await changeLanguage(language);
    } catch {
      setLanguageError(true);
    }
  };

  const closeMobileMenu = () => {
    setMenuOpen(false);
    if (window.matchMedia("(max-width: 47.9375rem)").matches) {
      menuButtonRef.current?.focus();
    }
  };

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    applyTheme(nextTheme);
  };

  return (
    <div className="public-app min-h-screen bg-[var(--oz-page-bg)] text-foreground [&_*]:box-border [&_a]:text-inherit [&_*:focus-visible]:outline-[0.1875rem] [&_*:focus-visible]:outline-offset-[0.1875rem] [&_*:focus-visible]:outline-[var(--oz-focus)]">
      <a
        className="fixed top-2 left-2 z-[100] -translate-y-[150%] bg-surface px-4 py-3 font-bold text-foreground focus:translate-y-0"
        href="#main-content"
      >
        {t("publicSkipContent")}
      </a>
      <header className="sticky top-0 z-50 border-b border-[var(--oz-header-border)] bg-[var(--oz-header-bg)] backdrop-blur-[0.625rem]">
        <div className="relative mx-auto flex min-h-[4.25rem] w-[min(8rem,calc(100%-3rem))] items-center gap-6 max-[66.25rem]:gap-[0.9375rem] max-[47.9375rem]:min-h-16 max-[47.9375rem]:w-[min(100%-2rem,37.5rem)] max-[47.9375rem]:gap-[0.6875rem] max-[3rem]:w-[min(100%-1.75rem,27.5rem)]">
          <a
            className="inline-flex shrink-0 items-center no-underline"
            href="/"
            aria-label={t("publicBrandHome")}
          >
            <img
              className="block h-[3.125rem] w-[8.625rem] object-contain max-[47.9375rem]:h-[2.8125rem] max-[47.9375rem]:w-[7.25rem]"
              src={logo}
              alt=""
            />
          </a>
          <button
            className="inline-flex size-10 cursor-pointer items-center justify-center rounded-md border border-border bg-surface text-foreground min-[48rem]:hidden max-[47.9375rem]:order-2 max-[47.9375rem]:ml-auto"
            ref={menuButtonRef}
            type="button"
            aria-expanded={menuOpen}
            aria-controls="public-navigation"
            aria-label={menuOpen ? t("publicCloseMenu") : t("publicOpenMenu")}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? (
              <X aria-hidden="true" size={21} />
            ) : (
              <Menu aria-hidden="true" size={21} />
            )}
          </button>
          <nav
            className={`ml-auto flex items-center justify-center gap-[clamp(0.875rem,2vw,1.8125rem)] [&>a:not([data-slot])]:inline-flex [&>a:not([data-slot])]:min-h-11 [&>a:not([data-slot])]:items-center [&>a:not([data-slot])]:text-sm [&>a:not([data-slot])]:font-semibold [&>a:not([data-slot])]:text-foreground [&>a:not([data-slot])]:no-underline [&>a:not([data-slot])]:underline-offset-[0.3125rem] [&>a:not([data-slot])]:hover:text-primary [&>a:not([data-slot])]:hover:underline [&>a:not([data-slot])]:aria-[current=page]:text-primary [&>a:not([data-slot])]:aria-[current=page]:underline max-[66.25rem]:gap-[0.9375rem] max-[66.25rem]:[&>a:not([data-slot])]:text-xs max-[47.9375rem]:absolute max-[47.9375rem]:top-full max-[47.9375rem]:right-[-1rem] max-[47.9375rem]:left-[-1rem] max-[47.9375rem]:hidden max-[47.9375rem]:items-stretch max-[47.9375rem]:flex-col max-[47.9375rem]:gap-0 max-[47.9375rem]:border-b max-[47.9375rem]:border-border max-[47.9375rem]:bg-surface max-[47.9375rem]:px-4 max-[47.9375rem]:pt-[0.5625rem] max-[47.9375rem]:pb-[1.125rem] max-[47.9375rem]:shadow-[0_0.75rem_1rem_rgba(31,41,55,0.1)] max-[47.9375rem]:[&>a:not([data-slot])]:min-h-[2.875rem] max-[47.9375rem]:[&>a:not([data-slot])]:border-b max-[47.9375rem]:[&>a:not([data-slot])]:border-border max-[47.9375rem]:[&>a:not([data-slot])]:py-[0.8125rem] max-[47.9375rem]:[&>a:not([data-slot])]:text-sm ${menuOpen ? "max-[47.9375rem]:flex" : ""}`}
            id="public-navigation"
            aria-label={t("publicMainNavigation")}
          >
            {navigation.map((item) => (
              <a
                href={item.href}
                key={item.href}
                aria-current={
                  isCatalog && item.href === "/velo" ? "page" : undefined
                }
                onClick={closeMobileMenu}
              >
                {t(item.label)}
              </a>
            ))}
            <Button
              asChild
              className="min-h-11 rounded-md border border-primary bg-primary text-[var(--oz-on-dark)] hover:bg-primary-hover hover:text-[var(--oz-on-dark)] dark:text-[#0d1715] max-[47.9375rem]:mt-3"
              size="sm"
            >
              <a href="/#contact">{t("publicContactCta")}</a>
            </Button>
          </nav>
          <div className="ml-2 flex items-center gap-2.5 max-[47.9375rem]:ml-0">
            <button
              type="button"
              className="inline-flex size-10 cursor-pointer items-center justify-center rounded-md border border-border bg-surface text-foreground"
              aria-label={
                theme === "dark" ? t("themeToggleLight") : t("themeToggleDark")
              }
              aria-pressed={theme === "dark"}
              onClick={toggleTheme}
            >
              {theme === "dark" ? (
                <SunMedium aria-hidden="true" size={16} />
              ) : (
                <Moon aria-hidden="true" size={16} />
              )}
            </button>
            <label className="max-[47.9375rem]:order-3">
              <span className="sr-only">{t("language")}</span>
              <select
                className="min-h-[2.625rem] min-w-14 rounded-md border border-border bg-surface px-[0.5625rem] py-[0.4375rem] text-[0.8125rem] text-foreground"
                value={i18n.language.slice(0, 2)}
                onChange={(event) =>
                  void handleLanguageChange(
                    event.target.value as SupportedLanguage,
                  )
                }
                aria-label={t("language")}
              >
                {supportedLanguages.map((language) => (
                  <option key={language} value={language}>
                    {language.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        {languageError && (
          <p className="sr-only" role="alert">
            {t("languageChangeError")}
          </p>
        )}
      </header>

      <main id="main-content" className="min-h-[50vh]">
        {children}
      </main>

      <footer className="bg-[#1f2937] text-[#f9fafb] [&_h2]:mt-0.5 [&_h2]:mb-[1.0625rem] [&_h2]:text-[1.0625rem] [&_h2]:font-bold [&_h2]:text-white [&_ul]:m-0 [&_ul]:grid [&_ul]:list-none [&_ul]:gap-[0.6875rem] [&_ul]:p-0 [&_li]:text-[0.8125rem] [&_li]:text-[#e5e7eb] [&_a]:text-[#e5e7eb] [&_a]:underline [&_a]:decoration-transparent [&_a]:underline-offset-4 [&_a:hover]:text-white [&_a:hover]:decoration-current [&_p]:text-[#e5e7eb]">
        <div className="mx-auto grid w-[min(75rem,calc(100%-3rem))] grid-cols-[1.45fr_0.8fr_0.9fr_0.9fr] gap-[2.625rem] py-14 pb-11 max-[47.9375rem]:w-[min(100%-2rem,37.5rem)] max-[47.9375rem]:grid-cols-2 max-[47.9375rem]:gap-[1.875rem_1.375rem] max-[47.9375rem]:py-[2.625rem] max-[47.9375rem]:pb-[2.125rem] max-[47.9375rem]:[&>section:first-child]:col-span-full max-[3rem]:w-[min(100%-1.75rem,27.5rem)] max-[3rem]:grid-cols-1 max-[3rem]:[&>section:first-child]:col-auto">
          <section aria-labelledby="footer-brand-title">
            <a
              className="inline-flex shrink-0 items-center no-underline"
              href="/"
              aria-label={t("publicBrandHome")}
            >
              <img
                className="block h-[3.375rem] w-[9.0625rem] rounded-md bg-white px-[0.4375rem] py-1 object-contain"
                src={logo}
                alt=""
              />
            </a>
            <h2 id="footer-brand-title" className="sr-only">
              Ocazbike
            </h2>
            <p className="mt-3.5 mb-[1.1875rem] max-w-[21.25rem] text-sm leading-[1.65] text-[#e5e7eb]">
              {t("publicFooterIntro")}
            </p>
            <ul className="gap-2 [&>li]:flex [&>li]:items-start [&>li]:gap-[0.5625rem] [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-[#bfdbca]">
              <li>
                <MapPin aria-hidden="true" />
                <span>{t("publicFooterAddress")}</span>
              </li>
              <li>
                <Phone aria-hidden="true" />
                <span>{t("publicFooterPhone")}</span>
              </li>
              <li>
                <Clock3 aria-hidden="true" />
                <span>{t("publicFooterHours")}</span>
              </li>
            </ul>
          </section>

          <nav aria-label={t("publicFooterNavigation")}>
            <h2>{t("publicNavTitle")}</h2>
            <ul>
              {navigation.map((item) => (
                <li key={item.href}>
                  <a href={item.href}>{t(item.label)}</a>
                </li>
              ))}
            </ul>
          </nav>

          <section aria-labelledby="footer-services-title">
            <h2 id="footer-services-title">{t("publicServicesTitle")}</h2>
            <ul>
              <li>
                <a href="/#services">{t("publicServiceRepair")}</a>
              </li>
              <li>
                <a href="/#services">{t("publicServiceSales")}</a>
              </li>
              <li>
                <a href="/#services">{t("publicServiceRental")}</a>
              </li>
              <li>
                <a href="/#services">{t("publicServiceBuyback")}</a>
              </li>
              <li>
                <a href="/#services">{t("publicServiceMaintenance")}</a>
              </li>
            </ul>
          </section>

          <section aria-labelledby="footer-hours-title">
            <h2 id="footer-hours-title">{t("publicOpeningHoursTitle")}</h2>
            <p>{t("publicFooterHoursPending")}</p>
          </section>
        </div>
        <div className="mx-auto flex min-h-16 w-[min(75rem,calc(100%-3rem))] items-center justify-between gap-5 border-t border-[#4b5563] max-[47.9375rem]:w-[min(100%-2rem,37.5rem)] max-[3rem]:w-[min(100%-1.75rem,27.5rem)] max-[3rem]:flex-col max-[3rem]:items-start max-[3rem]:justify-center max-[3rem]:gap-[0.3125rem] max-[3rem]:py-[0.875rem] [&>p]:m-0 [&>p]:text-xs [&>p]:text-[#e5e7eb] [&>a]:text-xs">
          <p>{t("publicCopyright", { year: new Date().getFullYear() })}</p>
          <a href="#main-content">{t("publicBackToTop")}</a>
        </div>
      </footer>
    </div>
  );
}
