import { afterEach, expect, it } from "bun:test";
import { createInstance } from "i18next";
import { renderToStaticMarkup } from "react-dom/server";
import { I18nextProvider } from "react-i18next";
import { AdminToastProvider } from "../../../components/admin/AdminToast";
import fr from "../../../translations/fr.json";
import { ClientOperations } from "./ClientOperations";

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
afterEach(() => {
  if (originalWindow)
    Object.defineProperty(globalThis, "window", originalWindow);
  else Reflect.deleteProperty(globalThis, "window");
});
const i18n = createInstance();
await i18n.init({ lng: "fr", resources: { fr: { translation: fr } } });

it("shows four operation grids without search, filters, creation or nested admin layouts", () => {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      location: {
        pathname: "/admin/clients/42",
        search: "?status=pending&search=Nobody",
      },
    },
  });
  const html = renderToStaticMarkup(
    <I18nextProvider i18n={i18n}>
      <AdminToastProvider>
        <ClientOperations clientId={42} />
      </AdminToastProvider>
    </I18nextProvider>,
  );
  expect(html.match(/<table/g)).toHaveLength(4);
  for (const title of [
    fr.adminRepairs,
    fr.adminSales,
    fr.adminBuybacks,
    fr.adminRentals,
  ])
    expect(html).toContain(title);
  expect(html).not.toContain('type="search"');
  expect(html).not.toContain('aria-haspopup="menu"');
  expect(html).not.toContain(fr.operationActiveFilters);
  expect(html).not.toContain(fr.newOperation);
  expect(html).not.toContain("<aside");
  expect(html).not.toContain("<dialog");
  expect(html.match(/<nav/g)).toHaveLength(4);
});
