import { type SubmitEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AddressInput } from "@/shared/ui/AddressInput";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Modal, ModalHeader } from "@/shared/ui/Modal";
import { PhoneInput } from "@/shared/ui/PhoneInput";
import type { StoreInformation } from "./types";

const fieldDefinitions = [
  ["name", "settingsStoreName", 120],
  ["address", "settingsStoreAddress", 500],
  ["phone", "settingsStorePhone", 40],
  ["secondaryPhone", "settingsStoreSecondaryPhone", 40],
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
}: Readonly<{
  open: boolean;
  information: StoreInformation;
  saving: boolean;
  onClose: () => void;
  onSubmit: (information: StoreInformation) => void;
}>) {
  const { t } = useTranslation();
  const [form, setForm] = useState(information);

  useEffect(() => {
    if (open) setForm(information);
  }, [information, open]);

  if (!open) return null;

  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = { ...form };
    for (const [field] of fieldDefinitions) {
      trimmed[field] = trimmed[field].trim();
    }
    onSubmit(trimmed);
  };

  return (
    <Modal
      className="rounded-md"
      aria-labelledby="store-information-dialog-title"
      onClose={onClose}
    >
      <form className="grid gap-3.5 p-5" onSubmit={submit}>
        <ModalHeader
          titleId="store-information-dialog-title"
          title={t("settingsStoreInformationTitle")}
          subtitle={t("settingsStoreInformationDescription")}
          onClose={onClose}
          closeDisabled={saving}
        />
        <div className="grid grid-cols-2 gap-3.5 max-[35rem]:grid-cols-1">
          {fieldDefinitions.map(([field, label, maxLength]) => {
            const isPhone = field === "phone" || field === "secondaryPhone";
            const FieldInput = isPhone ? PhoneInput : Input;
            let inputType = "text";
            let autoComplete: string | undefined;
            if (field === "email") {
              inputType = "email";
              autoComplete = "email";
            } else if (isPhone) {
              inputType = "tel";
              autoComplete = "tel";
            }

            return (
              <label
                className={
                  field === "address" ? "oz-field col-span-full" : "oz-field"
                }
                htmlFor={`store-information-${field}`}
                key={field}
              >
                {t(label)}
                {field === "address" ? (
                  <AddressInput
                    id={`store-information-${field}`}
                    multiline
                    value={form[field]}
                    onChange={(value) =>
                      setForm((current) => ({ ...current, [field]: value }))
                    }
                    maxLength={maxLength}
                  />
                ) : (
                  <FieldInput
                    id={`store-information-${field}`}
                    type={inputType}
                    autoComplete={autoComplete}
                    value={form[field]}
                    onBlur={() =>
                      setForm((current) => ({
                        ...current,
                        [field]: current[field].trim(),
                      }))
                    }
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
            );
          })}
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
    </Modal>
  );
}
