import { afterEach, describe, expect, it } from "bun:test";
import { createInstance } from "i18next";
import { renderToStaticMarkup } from "react-dom/server";
import { I18nextProvider } from "react-i18next";
import fr from "../../translations/fr.json";
import { OperationStatusCounts } from "./AdminSidebar";

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
afterEach(() => {
  if (originalWindow)
    Object.defineProperty(globalThis, "window", originalWindow);
  else Reflect.deleteProperty(globalThis, "window");
});
const i18n = createInstance();
await i18n.init({ lng: "fr", resources: { fr: { translation: fr } } });

describe("sidebar operation counts", () => {
  it.each(["repairs", "sales", "buybacks", "rentals"])(
    "shows three labelled counts and filtered links for %s",
    (path) => {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: {
          location: {
            pathname: `/admin/${path}`,
            search: "?status=in_progress",
          },
        },
      });
      const html = renderToStaticMarkup(
        <I18nextProvider i18n={i18n}>
          <OperationStatusCounts
            href={`/admin/${path}`}
            counts={{ pending: 51, in_progress: 2, payment_pending: 0 }}
          />
        </I18nextProvider>,
      );
      for (const status of ["pending", "in_progress", "payment_pending"]) {
        expect(html).toContain(`href="/admin/${path}?status=${status}"`);
      }
      expect(html).toContain("En attente");
      expect(html).toContain("En cours");
      expect(html).toContain("À payer");
      expect(html).not.toContain("<span>En attente</span>");
      expect(html).not.toContain("<span>En cours</span>");
      expect(html).not.toContain("<span>À payer</span>");
      expect(html).toContain('title="En attente"');
      expect(html).toContain("bg-amber-100");
      expect(html).toContain("bg-emerald-100");
      expect(html).toContain("bg-orange-100");
      expect(html).toContain(">51<");
      expect(html).toContain(">2<");
      expect(html).toContain(">0<");
      expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    },
  );
  it("does not present unavailable counts as zero", () => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { location: { pathname: "/admin", search: "" } },
    });
    const html = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <OperationStatusCounts href="/admin/repairs" counts={null} />
      </I18nextProvider>,
    );
    expect(html.match(/Compteur indisponible/g)).toHaveLength(3);
    expect(html).not.toContain(">0<");
  });
});
