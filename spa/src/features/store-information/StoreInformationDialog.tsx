import { X } from "lucide-react";
import { type SubmitEvent, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import type { StoreInformation } from "./types";

const fieldDefinitions = [
  ["name", "settingsStoreName", 120],
  ["address", "settingsStoreAddress", 500],
  ["phone", "settingsStorePhone", 40],
  ["email", "settingsStoreEmail", 254],
  ["siret", "settingsStoreSiret", 32],
  ["apeCode", "settingsStoreApe", 20],
  ["vatNumber", "settingsStoreVat", 32],
  ["bankName", "settingsStoreBank", 120],
  ["iban", "settingsStoreIban", 64],
  ["bic", "settingsStoreBic", 32],
] as const satisfies readonly [keyof StoreInformation, string, number][];

export function StoreInformationDialog({
  open,
  information,
  saving,
  onClose,
  onSubmit,
}: {
  open: boolean;
  information: StoreInformation;
  saving: boolean;
  onClose: () => void;
  onSubmit: (information: StoreInformation) => void;
}) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [form, setForm] = useState(information);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && dialog && !dialog.open) dialog.showModal();
    if (open) setForm(information);
  }, [information, open]);

  if (!open) return null;

  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(form);
  };

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[min(48rem,calc(100vw-2rem))] max-w-none overflow-y-auto rounded-md border border-border bg-surface p-0 text-foreground shadow-xl backdrop:bg-black/50"
      aria-labelledby="store-information-dialog-title"
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
              id="store-information-dialog-title"
            >
              {t("settingsStoreInformationTitle")}
            </h2>
            <p className="mt-1 mb-0 text-sm text-muted">
              {t("settingsStoreInformationDescription")}
            </p>
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
        <div className="grid grid-cols-2 gap-3.5 max-[35rem]:grid-cols-1">
          {fieldDefinitions.map(([field, label, maxLength]) => (
            <label
              className={field === "address" ? "col-span-full" : undefined}
              htmlFor={`store-information-${field}`}
              key={field}
            >
              {t(label)}
              {field === "address" ? (
                <textarea
                  id={`store-information-${field}`}
                  className="min-h-20 w-full rounded-[0.3125rem] border border-control-border bg-surface px-3 py-2.5 text-foreground"
                  value={form[field]}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      [field]: event.target.value,
                    }))
                  }
                  maxLength={maxLength}
                />
              ) : (
                <Input
                  id={`store-information-${field}`}
                  type={field === "email" ? "email" : "text"}
                  value={form[field]}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      [field]: event.target.value,
                    }))
                  }
                  maxLength={maxLength}
                />
              )}
            </label>
          ))}
        </div>
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
            {saving ? t("saving") : t("save")}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
