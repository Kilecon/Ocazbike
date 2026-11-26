import { afterEach, describe, expect, it } from "bun:test";
import { EMPTY_STORE_INFORMATION } from "@/features/store-information/types";
import fr from "@/shared/i18n/translations/fr.json";
import {
  createDom,
  domQueries,
  interact,
  setValue,
  type TestDom,
} from "@/shared/test/dom";
import { json } from "@/shared/test/mockFetch";
import { AdminToastProvider } from "@/shared/ui/AdminToast";
import { SettingsPage } from "./SettingsPage";

let dom: TestDom | undefined;
const originalFetch = globalThis.fetch;
afterEach(async () => {
  await dom?.cleanup();
  dom = undefined;
  globalThis.fetch = originalFetch;
});
const { element, button, click, submit } = domQueries(() => dom);

describe("settings page", () => {
  it("switches settings template tabs without counts by click and keyboard", async () => {
    globalThis.fetch = Object.assign(
      async () => json(EMPTY_STORE_INFORMATION),
      { preconnect: globalThis.fetch.preconnect },
    );
    dom = await createDom("/admin/settings");
    await dom.render(
      <AdminToastProvider>
        <SettingsPage />
      </AdminToastProvider>,
    );
    const invoiceTab = element("#settings-template-tab-invoice");
    const quoteTab = element("#settings-template-tab-quote");
    expect(invoiceTab.textContent).toBe(fr.settingsInvoiceTemplate);
    expect(quoteTab.textContent).toBe(fr.settingsQuoteTemplate);
    for (const [type, activate] of [
      ["quote", () => click(quoteTab)],
      [
        "invoice",
        () =>
          interact(() =>
            quoteTab.dispatchEvent(
              new KeyboardEvent("keydown", {
                key: "ArrowLeft",
                bubbles: true,
              }),
            ),
          ),
      ],
    ] as const) {
      await activate();
      expect(
        element(`#settings-template-tab-${type}`).getAttribute("aria-selected"),
      ).toBe("true");
      expect(element('[role="tabpanel"]').getAttribute("aria-labelledby")).toBe(
        `settings-template-tab-${type}`,
      );
      const previews = dom.container.querySelectorAll("iframe");
      expect(previews).toHaveLength(2);
      for (const preview of previews) {
        expect(preview.getAttribute("srcdoc")).toContain(
          `<h1>${type === "quote" ? "Devis" : "Facture"}</h1>`,
        );
      }
    }
  });

  it("saves store information and updates the document preview", async () => {
    const store = { ...EMPTY_STORE_INFORMATION, name: "Old shop" };
    let saved: unknown;
    globalThis.fetch = (async (url, options) => {
      if (new URL(String(url)).pathname === "/store-information") {
        if (options?.method === "PUT") {
          saved = JSON.parse(String(options.body));
          return json({
            ...store,
            name: "New shop",
            phone: "06 00 00 00 00",
            secondaryPhone: "06 00 00 00 00",
          });
        }
        return json(store);
      }
      return json({});
    }) as typeof fetch;
    dom = await createDom("/admin/settings");
    await dom.render(
      <AdminToastProvider>
        <SettingsPage />
      </AdminToastProvider>,
    );
    await click(button(fr.settingsStoreInformationEdit));
    await setValue(element("#store-information-name"), " New shop ");
    await setValue(element("#store-information-phone"), " 0600000000 ");
    await setValue(
      element("#store-information-secondaryPhone"),
      " 0600000000 ",
    );
    await submit("dialog form");
    expect(saved).toEqual({
      ...store,
      name: "New shop",
      phone: "0600000000",
      secondaryPhone: "0600000000",
    });
    expect(dom.container.querySelector("dialog")).toBeNull();
    expect(dom.container.textContent).toContain(
      fr.settingsStoreInformationSaved,
    );
    expect(element("iframe").getAttribute("srcdoc")).toContain("New shop");
    expect(element("iframe").getAttribute("srcdoc")).toContain(
      "06 00 00 00 00<br>06 00 00 00 00",
    );
  });
});
