import { describe, expect, it } from "bun:test";
import { createInstance } from "i18next";
import { renderToStaticMarkup } from "react-dom/server";
import { I18nextProvider } from "react-i18next";
import fr from "../../translations/fr.json";
import { DateInput, formatDateInput, parseDateInput } from "./date-input";

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
