import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { isValidPhoneNumber } from "@/shared/lib/phone";
import { Input } from "./Input";

export function PhoneInput({
  required,
  onChange,
  onBlur,
  ...props
}: Omit<ComponentProps<typeof Input>, "type" | "pattern" | "ref">) {
  const { t } = useTranslation();
  const validate = (field: HTMLInputElement) => {
    const value = field.value.trim();
    const message = value
      ? isValidPhoneNumber(value)
        ? ""
        : t("invalidPhone")
      : required
        ? t("requiredField")
        : "";
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
