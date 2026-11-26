import { type SubmitEvent, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiError } from "@/shared/api/http";
import { useAdminToast } from "@/shared/ui/AdminToast";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { AuthCard } from "./AuthCard";
import { changeInitialPassword } from "./api";

export function InitialPasswordChangePage({
  onComplete,
}: Readonly<{
  onComplete: () => Promise<void>;
}>) {
  const { t } = useTranslation();
  const { showToast, showErrorToast } = useAdminToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [currentError, setCurrentError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmationError, setConfirmationError] = useState("");
  const currentRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmationRef = useRef<HTMLInputElement>(null);

  const submit = async (event: SubmitEvent) => {
    event.preventDefault();
    if (password !== confirmation) {
      setConfirmationError(t("passwordsDoNotMatch"));
      confirmationRef.current?.focus();
      return;
    }

    setSubmitting(true);
    try {
      await changeInitialPassword(currentPassword, password);
      showToast("success", t("toastSuccess"), t("passwordChangeSuccess"));
      try {
        await onComplete();
      } catch (sessionError) {
        showErrorToast(sessionError, t("loginError"));
      }
    } catch (changeError) {
      if (
        changeError instanceof ApiError &&
        changeError.code === "INVALID_CURRENT_PASSWORD"
      ) {
        setCurrentError(t("INVALID_CURRENT_PASSWORD"));
        currentRef.current?.focus();
      } else if (
        changeError instanceof ApiError &&
        changeError.code === "INVALID_PASSWORD"
      ) {
        setPasswordError(t("INVALID_PASSWORD"));
        passwordRef.current?.focus();
      } else showErrorToast(changeError, t("passwordChangeError"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthCard
      titleId="password-change-title"
      title={t("initialPasswordChangeTitle")}
      intro={t("initialPasswordChangeIntro")}
    >
      <form onSubmit={submit} className="mt-6 grid gap-4">
        <label htmlFor="current-password" className="oz-field">
          {t("currentPassword")}
          <Input
            id="current-password"
            ref={currentRef}
            type="password"
            value={currentPassword}
            onChange={(event) => {
              setCurrentPassword(event.target.value);
              setCurrentError("");
            }}
            error={currentError}
            autoComplete="current-password"
            required
          />
        </label>
        <label htmlFor="new-password" className="oz-field">
          {t("newPassword")}
          <Input
            id="new-password"
            ref={passwordRef}
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setPasswordError("");
              setConfirmationError("");
            }}
            error={passwordError}
            autoComplete="new-password"
            minLength={12}
            required
          />
        </label>
        <label htmlFor="confirm-password" className="oz-field">
          {t("confirmPassword")}
          <Input
            id="confirm-password"
            ref={confirmationRef}
            type="password"
            value={confirmation}
            onChange={(event) => {
              setConfirmation(event.target.value);
              setConfirmationError("");
            }}
            error={confirmationError}
            autoComplete="new-password"
            minLength={12}
            required
          />
        </label>
        <Button type="submit" disabled={submitting}>
          {submitting ? t("savingPassword") : t("changePassword")}
        </Button>
      </form>
    </AuthCard>
  );
}
