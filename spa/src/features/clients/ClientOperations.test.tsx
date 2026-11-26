import { expect, it } from "bun:test";
import fr from "@/shared/i18n/translations/fr.json";
import {
  renderTranslated,
  restoreBrowserGlobalsAfterEach,
  setBrowserLocation,
} from "@/shared/test/render";
import { AdminToastProvider } from "@/shared/ui/AdminToast";
import { ClientOperations } from "./ClientOperations";

restoreBrowserGlobalsAfterEach("window");

it("shows four operation grids without search, filters, creation or nested admin layouts", () => {
  setBrowserLocation("/admin/clients/42", "?status=pending&search=Nobody");
  const html = renderTranslated(
    <AdminToastProvider>
      <ClientOperations clientId={42} />
    </AdminToastProvider>,
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
