import { afterEach, describe, expect, it } from "bun:test";
import fr from "@/shared/i18n/translations/fr.json";
import { createDom, interact } from "@/shared/test/dom";

let dom: Awaited<ReturnType<typeof createDom>> | undefined;

afterEach(async () => {
  await dom?.cleanup();
  dom = undefined;
});

describe("native form validation messages", () => {
  it("translates missing required input errors and clears them after edits", async () => {
    dom = await createDom();
    const { browser } = dom;
    const { installNativeFormValidationMessages } = await import(
      "./nativeFormValidation"
    );
    installNativeFormValidationMessages();

    const input = browser.document.createElement("input");
    input.required = true;
    browser.document.body.append(input);

    await interact(() =>
      input.dispatchEvent(
        new browser.Event("invalid", { bubbles: true, cancelable: true }),
      ),
    );
    expect(input.validationMessage).toBe(fr.requiredField);

    input.value = "Ada";
    await interact(() =>
      input.dispatchEvent(new browser.Event("input", { bubbles: true })),
    );
    expect(input.validationMessage).toBe("");

    input.value = "";
    await interact(() => input.setCustomValidity("old error"));
    await interact(() =>
      input.dispatchEvent(
        new browser.Event("invalid", { bubbles: true, cancelable: true }),
      ),
    );
    expect(input.validationMessage).toBe(fr.requiredField);

    input.value = "Ada";
    await interact(() =>
      input.dispatchEvent(new browser.Event("change", { bubbles: true })),
    );
    expect(input.validationMessage).toBe("");
  });
});
