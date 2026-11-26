import type { SubmitEvent } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Modal, ModalHeader } from "@/shared/ui/Modal";
import { Tooltip } from "@/shared/ui/Tooltip";

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
}: Readonly<{
  open: boolean;
  form: Readonly<UserForm>;
  saving: boolean;
  onChange: (field: keyof UserForm, value: string) => void;
  onClose: () => void;
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
}>) {
  const { t } = useTranslation();

  if (!open) return null;

  return (
    <Modal aria-labelledby="create-user-dialog-title" onClose={onClose}>
      <form className="grid gap-3.5 p-5" onSubmit={onSubmit}>
        <ModalHeader
          titleId="create-user-dialog-title"
          title={t("usersCreate")}
          subtitle={t("createUserDialogSubtitle")}
          onClose={onClose}
        />
        <Tooltip type="info" message={t("usersFirstLoginPasswordInfo")} />
        <Tooltip type="warn" message={t("adminAccountDeletionWarning")} />
        <div className="grid grid-cols-2 gap-3.5 max-[35rem]:grid-cols-1">
          <label className="oz-field" htmlFor="user-firstname">
            {t("usersFirstname")}
            <Input
              id="user-firstname"
              value={form.firstname}
              onChange={(event) => onChange("firstname", event.target.value)}
              maxLength={100}
              pattern={String.raw`.*\S.*`}
              required
            />
          </label>
          <label className="oz-field" htmlFor="user-lastname">
            {t("usersLastname")}
            <Input
              id="user-lastname"
              value={form.lastname}
              onChange={(event) => onChange("lastname", event.target.value)}
              maxLength={100}
              pattern={String.raw`.*\S.*`}
              required
            />
          </label>
        </div>
        <label className="oz-field" htmlFor="user-email">
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
        <label className="oz-field" htmlFor="user-password">
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
        <label className="oz-field" htmlFor="user-role">
          {t("usersRole")}
          <select
            id="user-role"
            className="oz-input h-10 w-full px-3 text-foreground"
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
    </Modal>
  );
}
