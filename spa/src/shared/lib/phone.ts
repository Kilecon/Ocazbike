import { parsePhoneNumberFromString } from "libphonenumber-js/max";

export function isValidPhoneNumber(value: string): boolean {
  return (
    parsePhoneNumberFromString(value.trim(), {
      defaultCountry: "FR",
      extract: false,
    })?.isValid() ?? false
  );
}
