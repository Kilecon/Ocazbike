import { afterEach, describe, expect, it } from "bun:test";
import { createInstance } from "i18next";
import { useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { I18nextProvider } from "react-i18next";
import fr from "@/shared/i18n/translations/fr.json";
import {
  createDom,
  domQueries,
  interact,
  setValue,
  type TestDom,
} from "@/shared/test/dom";
import { DateInput, formatDateInput, parseDateInput } from "./DateInput";

describe("DateInput", () => {
  it("formats and parses dates in the browser language order", () => {
    expect(formatDateInput("2026-11-03", "fr")).toBe("03/11/2026");
    expect(formatDateInput("2026-11-03", "en")).toBe("11/03/2026");
    expect(parseDateInput("03/11/2026", "fr")).toBe("2026-11-03");
    expect(parseDateInput("11/03/2026", "en")).toBe("2026-11-03");
    expect(parseDateInput("31/02/2026", "fr")).toBeNull();
  });

  it("renders a French field instead of a browser-localized date input", async () => {
    const i18n = createInstance();
    await i18n.init({ lng: "fr", resources: { fr: { translation: fr } } });
    const html = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <DateInput id="date" value="2026-11-03" onChange={() => {}} required />
      </I18nextProvider>,
    );
    expect(html).not.toContain('type="date"');
    expect(html).toContain('value="03/11/2026"');
    expect(html).toContain('placeholder="jj/mm/aaaa"');
  });
});

let dom: TestDom | undefined;
const originalFetch = globalThis.fetch;
afterEach(async () => {
  await dom?.cleanup();
  dom = undefined;
  globalThis.fetch = originalFetch;
});
const { element, click } = domQueries(() => dom);

describe("DateInput interactions", () => {
  it("validates and clears typed dates and closes the calendar on Escape", async () => {
    dom = await createDom();
    const changes: string[] = [];
    function Field() {
      const [date, setDate] = useState("");
      return (
        <DateInput
          id="date"
          value={date}
          onChange={(value) => {
            changes.push(value);
            setDate(value);
          }}
        />
      );
    }
    await dom.render(<Field />);
    await setValue(element("#date"), "31/02/2026");
    expect((element("#date") as HTMLInputElement).validationMessage).not.toBe(
      "",
    );
    expect(changes).toEqual([]);
    await interact(() => {
      const input = element("#date") as HTMLInputElement;
      input.focus();
      input.setCustomValidity("");
      input.blur();
    });
    expect((element("#date") as HTMLInputElement).validity.valid).toBe(false);
    expect((element("#date") as HTMLInputElement).value).toBe("31/02/2026");
    await setValue(element("#date"), "03/11/2026");
    expect(changes).toEqual(["2026-11-03"]);
    expect((element("#date") as HTMLInputElement).validationMessage).toBe("");
    await click(element(`button[aria-label="${fr.openCalendar}"]`));
    expect(dom.container.querySelector("dialog")).not.toBeNull();
    await interact(() =>
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      ),
    );
    expect(dom.container.querySelector("dialog")).toBeNull();
    expect(dom.browser.document.activeElement?.id).toBe("date");
    await setValue(element("#date"), "");
    expect(changes).toEqual(["2026-11-03", ""]);
    await click(element(`button[aria-label="${fr.openCalendar}"]`));
    expect(dom.container.querySelectorAll(".oz-calendar-select")).toHaveLength(
      2,
    );
    await setValue(element(".rdp-dropdowns > span:first-child select"), "0");
    await setValue(
      element(".rdp-dropdowns > span:nth-child(2) select"),
      "2027",
    );
    await click(element('.oz-date-picker [data-day="2027-01-05"] button'));
    expect((element("#date") as HTMLInputElement).value).toBe("05/01/2027");
    expect(changes.at(-1)).toBe("2027-01-05");
    expect(dom.container.querySelector("dialog")).toBeNull();
  });
});
