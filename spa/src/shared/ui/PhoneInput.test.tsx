import { afterEach, describe, expect, it } from "bun:test";
import { useState } from "react";
import fr from "@/shared/i18n/translations/fr.json";
import {
  createDom,
  domQueries,
  interact,
  setValue,
  type TestDom,
} from "@/shared/test/dom";
import { PhoneInput } from "./PhoneInput";

let dom: TestDom | undefined;
const originalFetch = globalThis.fetch;
afterEach(async () => {
  await dom?.cleanup();
  dom = undefined;
  globalThis.fetch = originalFetch;
});
const { element, button, click } = domQueries(() => dom);

describe("PhoneInput", () => {
  it("validates phone inputs initially, on change, and when they become required", async () => {
    dom = await createDom();
    function PhoneForm() {
      const [phone, setPhone] = useState("1234567890");
      const [required, setRequired] = useState(false);
      return (
        <form>
          <PhoneInput
            id="phone"
            value={phone}
            required={required}
            onChange={(event) => setPhone(event.target.value)}
          />
          <button type="button" onClick={() => setRequired(true)}>
            Require phone
          </button>
        </form>
      );
    }
    await dom.render(<PhoneForm />);
    const input = element("#phone") as HTMLInputElement;
    expect(input.validity.valid).toBe(false);
    await interact(() => {
      input.checkValidity();
    });
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(dom.container.textContent).toContain(fr.invalidPhone);
    await setValue(input, "+33 6 00 00 00 00");
    expect(input.validity.valid).toBe(true);
    expect(input.getAttribute("aria-invalid")).toBeNull();
    await setValue(input, "   ");
    expect(input.validity.valid).toBe(true);
    await click(button("Require phone"));
    expect(input.validity.valid).toBe(false);
    expect(input.validationMessage).toBe(fr.requiredField);
    await setValue(input, "06 00 00 00 00");
    expect(input.validity.valid).toBe(true);
  });
});
