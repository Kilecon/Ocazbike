import { X } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import type { SupportRequestType } from "../../../services/types";

export interface SupportRequestForm {
  type: SupportRequestType;
  title: string;
  description: string;
}

export function CreateSupportDialog({
  open,
  saving,
  onClose,
  onSubmit,
}: {
  open: boolean;
  saving: boolean;
  onClose: () => void;
  onSubmit: (form: SupportRequestForm) => void;
}) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [type, setType] = useState<SupportRequestType>("SR");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && dialog && !dialog.open) dialog.showModal();
    if (open) {
      setType("SR");
      setTitle("");
      setDescription("");
    }
  }, [open]);

  if (!open) return null;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit({ type, title, description });
  };

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[min(48rem,calc(100vw-2rem))] max-w-none overflow-y-auto rounded-md border border-border bg-surface p-0 text-foreground shadow-xl backdrop:bg-black/50"
      aria-labelledby="create-support-dialog-title"
      onClose={onClose}
    >
      <form
        className="grid gap-3.5 p-5 [&>label]:grid [&>label]:gap-1.5 [&>label]:text-sm [&>label]:font-semibold [&>label]:text-foreground"
        onSubmit={submit}
      >
        <header className="flex items-start justify-between gap-4">
          <div>
            <h2
              className="m-0 text-base font-bold"
              id="create-support-dialog-title"
            >
              {t("supportNewRequest")}
            </h2>
            <p className="mt-1 mb-0 text-sm text-muted">{t("supportIntro")}</p>
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={t("modalClose")}
            disabled={saving}
            onClick={onClose}
          >
            <X size={18} aria-hidden="true" />
          </Button>
        </header>
        <fieldset className="m-0 grid grid-cols-3 gap-2.5 border-0 p-0 max-[35rem]:grid-cols-1">
          <legend className="mb-2 text-sm font-semibold text-foreground">
            {t("supportType")}
          </legend>
          {(["SR", "INC", "BUG"] as const).map((requestType) => (
            <label
              key={requestType}
              className="flex min-h-[4.625rem] cursor-pointer items-center gap-2.5 rounded-[0.3125rem] border border-border bg-surface-muted p-3"
            >
              <input
                className="accent-primary"
                type="radio"
                name="support-type"
                value={requestType}
                checked={type === requestType}
                onChange={() => setType(requestType)}
              />
              <span className="grid gap-1 text-foreground">
                <strong>{t(`supportType_${requestType}`)}</strong>
                <small className="text-muted">{requestType}</small>
              </span>
            </label>
          ))}
        </fieldset>
        <label htmlFor="support-title-input">
          {t("supportRequestTitle")}
          <Input
            id="support-title-input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={200}
            required
          />
        </label>
        <label htmlFor="support-description">
          {t("supportDescription")}
          <textarea
            id="support-description"
            className="min-h-[9.375rem] w-full resize-y rounded-[0.3125rem] border border-control-border bg-surface px-3 py-2.5 text-foreground"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={7}
            maxLength={5000}
            required
          />
        </label>
        <div className="mt-1 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={onClose}
          >
            {t("cancel")}
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? t("saving") : t("supportSubmit")}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
