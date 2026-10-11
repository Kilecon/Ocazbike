import { Moon, SunMedium } from "lucide-react";
import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui/button";
import { login } from "../../services/auth.api";
import { applyTheme, getPreferredTheme } from "../../theme";

export function LoginPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    getPreferredTheme(),
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const tokens = await login(email, password);
      localStorage.setItem("accessToken", tokens.accessToken);
      localStorage.setItem("refreshToken", tokens.refreshToken);
      window.location.assign("/admin");
    } catch (loginError) {
      setError(
        loginError instanceof Error ? loginError.message : t("loginError"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    applyTheme(nextTheme);
  };

  return (
    <main className="grid min-h-screen place-items-center bg-surface-muted p-6 dark:bg-[var(--oz-page-bg)]">
      <section
        className="w-full max-w-[440px] rounded-md border border-border bg-surface p-[clamp(24px,5vw,40px)] [&_*:focus-visible]:outline-[3px] [&_*:focus-visible]:outline-offset-[3px] [&_*:focus-visible]:outline-[var(--oz-focus)]"
        aria-labelledby="login-title"
      >
        <div className="mb-3 flex items-center justify-between gap-4">
          <div className="flex w-fit items-center gap-2.5 font-[var(--font-display)] text-[1.05rem] font-bold text-foreground no-underline">
            <span className="grid size-8 shrink-0 place-items-center rounded-[5px] bg-primary text-[0.8rem] text-[var(--oz-on-dark)]">
              N
            </span>
            <span>{t("adminBrand")}</span>
          </div>
          <button
            type="button"
            className="oz-theme-toggle"
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
        </div>
        <span className="text-[0.72rem] font-bold text-muted">
          {t("adminKicker")}
        </span>
        <h1
          className="my-2 font-[var(--font-display)] text-[1.75rem] leading-[1.2] text-foreground"
          id="login-title"
        >
          {t("loginTitle")}
        </h1>
        <p className="m-0 text-muted">{t("loginIntro")}</p>
        <form
          onSubmit={submit}
          className="mt-6 grid gap-4 [&>label]:grid [&>label]:gap-1.5 [&>label]:text-sm [&>label]:font-semibold [&>label]:text-foreground [&_input]:min-h-11 [&_input]:rounded-[5px] [&_input]:border [&_input]:border-control-border [&_input]:bg-surface [&_input]:px-[11px] [&_input]:py-[9px] [&_input]:text-foreground"
        >
          <label>
            {t("email")}
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label>
            {t("password")}
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error && (
            <p className="m-0 text-[0.9rem] text-destructive" role="alert">
              {error}
            </p>
          )}
          <Button variant="default" disabled={submitting} type="submit">
            {submitting ? t("loggingIn") : t("login")}
          </Button>
        </form>
      </section>
    </main>
  );
}
