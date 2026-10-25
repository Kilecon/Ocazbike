import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAdminToast } from "../../components/admin/AdminToast";
import { Button } from "../../components/ui/button";
import { changeInitialPassword } from "../../services/auth.api";

export function InitialPasswordChangePage({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const { t } = useTranslation();
  const { showToast, showErrorToast } = useAdminToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (password !== confirmation) {
      showToast("error", t("toastError"), t("passwordsDoNotMatch"));
      return;
    }

    setSubmitting(true);
    try {
      await changeInitialPassword(currentPassword, password);
      onComplete();
    } catch (changeError) {
      showErrorToast(changeError, t("passwordChangeError"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-surface-muted p-6 dark:bg-[var(--oz-page-bg)]">
      <section
        className="w-full max-w-[27.5rem] rounded-md border border-border bg-surface p-[clamp(1.5rem,5vw,2.5rem)]"
        aria-labelledby="password-change-title"
      >
        <h1
          className="my-2 font-[var(--font-display)] text-[1.75rem] leading-[1.2] text-foreground"
          id="password-change-title"
        >
          {t("initialPasswordChangeTitle")}
        </h1>
        <p className="m-0 text-muted">{t("initialPasswordChangeIntro")}</p>
        <form onSubmit={submit} className="mt-6 grid gap-4">
          <label className="grid gap-1.5 text-sm font-semibold text-foreground">
            {t("currentPassword")}
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-foreground">
            {t("newPassword")}
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              minLength={12}
              required
            />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-foreground">
            {t("confirmPassword")}
            <input
              type="password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="new-password"
              minLength={12}
              required
            />
          </label>
          <Button type="submit" disabled={submitting}>
            {submitting ? t("savingPassword") : t("changePassword")}
          </Button>
        </form>
      </section>
    </main>
  );
}
