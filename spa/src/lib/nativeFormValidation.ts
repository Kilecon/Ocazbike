import i18n, { getBrowserLanguage } from "../i18n";

type ValidatableField =
  | HTMLInputElement
  | HTMLSelectElement
  | HTMLTextAreaElement;

function getValidatableField(
  target: EventTarget | null,
): ValidatableField | null {
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLTextAreaElement
  ) {
    return target;
  }
  return null;
}

export function installNativeFormValidationMessages() {
  document.addEventListener(
    "invalid",
    (event) => {
      const field = getValidatableField(event.target);
      if (field?.validity.valueMissing) {
        field.setCustomValidity(
          i18n.t("requiredField", { lng: getBrowserLanguage() }),
        );
      }
    },
    true,
  );

  const clearCustomValidity = (event: Event) => {
    getValidatableField(event.target)?.setCustomValidity("");
  };
  document.addEventListener("input", clearCustomValidity, true);
  document.addEventListener("change", clearCustomValidity, true);
}
