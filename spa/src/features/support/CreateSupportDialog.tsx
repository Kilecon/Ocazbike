import { type SubmitEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Modal, ModalHeader } from "@/shared/ui/Modal";
import type { SupportRequestType } from "./types";

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
}: Readonly<{
  open: boolean;
  saving: boolean;
  onClose: () => void;
  onSubmit: (form: SupportRequestForm) => void;
}>) {
  const { t } = useTranslation();
  const [type, setType] = useState<SupportRequestType>("SR");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (open) {
      setType("SR");
      setTitle("");
      setDescription("");
    }
  }, [open]);

  if (!open) return null;

  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit({ type, title, description });
  };

  return (
    <Modal aria-labelledby="create-support-dialog-title" onClose={onClose}>
      <form className="grid gap-3.5 p-5" onSubmit={submit}>
        <ModalHeader
          titleId="create-support-dialog-title"
          title={t("supportNewRequest")}
          subtitle={t("supportIntro")}
          onClose={onClose}
          closeDisabled={saving}
        />
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
                aria-label={t(`supportType_${requestType}`)}
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
        <label className="oz-field" htmlFor="support-title-input">
          {t("supportRequestTitle")}
          <Input
            id="support-title-input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={200}
            pattern={String.raw`.*\S.*`}
            required
          />
        </label>
        <label className="oz-field" htmlFor="support-description">
          {t("supportDescription")}
          <textarea
            id="support-description"
            className="oz-input min-h-[9.375rem] w-full resize-y px-3 py-2.5 text-foreground"
            value={description}
            onChange={(event) => {
              const value = event.target.value;
              event.target.setCustomValidity(
                value && !value.trim() ? t("requiredField") : "",
              );
              setDescription(value);
            }}
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
    </Modal>
  );
}
