import { t } from "elysia";
import { FormatRegistry } from "elysia/type-system";
import { parsePhoneNumberFromString } from "libphonenumber-js/max";

export function isValidPhoneNumber(value: string): boolean {
  return (
    parsePhoneNumberFromString(value.trim(), {
      defaultCountry: "FR",
      extract: false,
    })?.isValid() ?? false
  );
}

FormatRegistry.Set("phone-number", isValidPhoneNumber);
FormatRegistry.Set(
  "optional-phone-number",
  (value) => !value.trim() || isValidPhoneNumber(value),
);

export const phoneSchema = t.String({
  maxLength: 40,
  format: "phone-number",
});
export const optionalPhoneSchema = t.String({
  maxLength: 40,
  format: "optional-phone-number",
});

export function formatPhoneNumber(value: string): string {
  const trimmed = value.trim();
  const phone = parsePhoneNumberFromString(trimmed, {
    defaultCountry: "FR",
    extract: false,
  });
  if (!phone?.isValid()) return trimmed;
  return phone.country === "FR" && !/^(?:\+|00)/.test(trimmed)
    ? phone.formatNational()
    : phone.formatInternational();
}
