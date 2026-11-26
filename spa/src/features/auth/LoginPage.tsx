import { Moon, SunMedium } from "lucide-react";
import { type SubmitEvent, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiError } from "@/shared/api/http";
import { useTheme } from "@/shared/theme/theme";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { AuthCard } from "./AuthCard";
import { login } from "./api";
import { useRefreshSession } from "./session";

export function LoginPage({
  initialError = "",
}: Readonly<{ initialError?: string }>) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(initialError);
  const [credentialsError, setCredentialsError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);
  const { theme, toggleTheme } = useTheme();
  const refreshSession = useRefreshSession();

  const submit = async (event: SubmitEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setCredentialsError("");

    try {
      await login(email, password);
      const session = await refreshSession();
      // The gate keeps this page mounted when the account cannot enter.
      if (session?.status === "anonymous" && session.error)
        setError(t(session.error));
    } catch (loginError) {
      if (
        loginError instanceof ApiError &&
        loginError.code === "UNAUTHORIZED"
      ) {
        setCredentialsError(t("InvalidCreds"));
        passwordRef.current?.focus();
      } else setError(t("loginError"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthCard
      titleId="login-title"
      kicker={t("adminKicker")}
      title={t("loginTitle")}
      intro={t("loginIntro")}
      headerAction={
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
            <SunMedium aria-hidden="true" size="1rem" />
          ) : (
            <Moon aria-hidden="true" size="1rem" />
          )}
        </button>
      }
    >
      <form onSubmit={submit} className="mt-6 grid gap-4">
        <label className="oz-field" htmlFor="login-email">
          {t("email")}
          <Input
            id="login-email"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setCredentialsError("");
            }}
            autoComplete="username"
            aria-invalid={credentialsError ? true : undefined}
            required
          />
        </label>
        <label className="oz-field" htmlFor="login-password">
          {t("password")}
          <Input
            id="login-password"
            ref={passwordRef}
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setCredentialsError("");
            }}
            error={credentialsError}
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
    </AuthCard>
  );
}
