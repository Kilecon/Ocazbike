import { describe, expect, it } from "bun:test";
import { createInstance } from "i18next";
import { renderToStaticMarkup } from "react-dom/server";
import { I18nextProvider } from "react-i18next";
import fr from "../../../translations/fr.json";
import { RepairDates } from "./RepairDates";

const i18n = createInstance();
await i18n.init({ lng: "fr", resources: { fr: { translation: fr } } });

describe("repair dates", () => {
  it("labels the rental grid with service start and end dates", () => {
    const html = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <RepairDates
          createdAt={Date.UTC(2026, 9, 2, 12)}
          closedAt={Date.UTC(2026, 9, 8, 12)}
          language="fr"
          servicePeriod
        />
      </I18nextProvider>,
    );
    expect(html).toContain(`${fr.serviceStartDate}: 02/10/2026`);
    expect(html).toContain(`${fr.serviceEndDate}: 08/10/2026`);
    expect(html).not.toContain("Création");
    expect(html).not.toContain("Clôture");
  });
  it("displays creation and closure dates without hours", () => {
    const html = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <RepairDates
          createdAt={Date.UTC(2026, 9, 1, 12, 34, 56)}
          closedAt={Date.UTC(2026, 9, 31, 12, 45, 12)}
          language="fr"
        />
      </I18nextProvider>,
    );
    expect(html).toContain("Création: 01/10/2026");
    expect(html).toContain("Clôture: 31/10/2026");
    expect(html).not.toContain("12:34");
    expect(html).not.toContain("12:45");
  });

  it("does not substitute a date when the repair is still open", () => {
    const html = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <RepairDates
          createdAt={Date.UTC(2026, 9, 1, 12)}
          closedAt={null}
          language="fr"
        />
      </I18nextProvider>,
    );
    expect(html).toContain("Clôture: —");
  });
});
