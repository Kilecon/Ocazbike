import { X } from "lucide-react";
import { type FormEvent, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Tooltip } from "../../../components/ui/tooltip";

interface UserForm {
  firstname: string;
  lastname: string;
  email: string;
  password: string;
  role: "Admin" | "Subadmin";
}

export function CreateUserDialog({
  open,
  form,
  saving,
  onChange,
  onClose,
  onSubmit,
}: {
  open: boolean;
  form: UserForm;
  saving: boolean;
  onChange: (field: keyof UserForm, value: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && dialog && !dialog.open) dialog.showModal();
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[min(48rem,calc(100vw-2rem))] max-w-none overflow-y-auto rounded-md border border-border bg-surface p-0 text-foreground shadow-xl backdrop:bg-black/50"
      aria-labelledby="create-user-dialog-title"
      onClose={onClose}
    >
      <form
        className="grid gap-3.5 p-5 [&_label]:grid [&_label]:gap-1.5 [&_label]:text-sm [&_label]:font-semibold [&_label]:text-foreground"
        onSubmit={onSubmit}
      >
        <header className="flex items-start justify-between gap-4">
          <div>
            <h2
              className="m-0 text-base font-bold"
              id="create-user-dialog-title"
            >
              {t("usersCreate")}
            </h2>
            <p className="mt-1 mb-0 text-sm text-muted">
              {t("createUserDialogSubtitle")}
            </p>
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={t("modalClose")}
            onClick={onClose}
          >
            <X size={18} aria-hidden="true" />
          </Button>
        </header>
        <Tooltip type="info" message={t("usersFirstLoginPasswordInfo")} />
        <Tooltip type="warn" message={t("adminAccountDeletionWarning")} />
        <div className="grid grid-cols-2 gap-3.5 max-[35rem]:grid-cols-1">
          <label htmlFor="user-firstname">
            {t("usersFirstname")}
            <Input
              id="user-firstname"
              value={form.firstname}
              onChange={(event) => onChange("firstname", event.target.value)}
              maxLength={100}
              required
            />
          </label>
          <label htmlFor="user-lastname">
            {t("usersLastname")}
            <Input
              id="user-lastname"
              value={form.lastname}
              onChange={(event) => onChange("lastname", event.target.value)}
              maxLength={100}
              required
            />
          </label>
        </div>
        <label htmlFor="user-email">
          {t("usersEmail")}
          <Input
            id="user-email"
            type="email"
            autoComplete="off"
            value={form.email}
            onChange={(event) => onChange("email", event.target.value)}
            required
          />
        </label>
        <label htmlFor="user-password">
          {t("usersPassword")}
          <Input
            id="user-password"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={(event) => onChange("password", event.target.value)}
            minLength={12}
            required
          />
        </label>
        <label htmlFor="user-role">
          {t("usersRole")}
          <select
            id="user-role"
            className="h-10 w-full rounded-[0.3125rem] border border-control-border bg-surface px-3 text-foreground"
            value={form.role}
            onChange={(event) => onChange("role", event.target.value)}
          >
            <option value="Subadmin">{t("roleSubadmin")}</option>
            <option value="Admin">{t("roleAdmin")}</option>
          </select>
        </label>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button type="submit" disabled={saving}>
            {t("usersCreate")}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
