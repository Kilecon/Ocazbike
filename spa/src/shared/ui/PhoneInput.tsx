import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { isValidPhoneNumber } from "@/shared/lib/phone";
import { Input } from "./Input";

export function PhoneInput({
  required,
  onChange,
  onBlur,
  ...props
}: Readonly<Omit<ComponentProps<typeof Input>, "type" | "pattern" | "ref">>) {
  const { t } = useTranslation();
  const validate = (field: HTMLInputElement) => {
    const value = field.value.trim();
    let message = "";
    if (!value && required) {
      message = t("requiredField");
    } else if (value && !isValidPhoneNumber(value)) {
      message = t("invalidPhone");
    }
    field.setCustomValidity(message);
  };

  return (
    <Input
      autoComplete="tel"
      {...props}
      type="tel"
      required={required}
      ref={(field) => {
        if (field) validate(field);
      }}
      onChange={(event) => {
        validate(event.currentTarget);
        onChange?.(event);
      }}
      onBlur={(event) => {
        validate(event.currentTarget);
        onBlur?.(event);
      }}
    />
  );
}
