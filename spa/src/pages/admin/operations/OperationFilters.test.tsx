import { describe, expect, it } from "bun:test";
import { createInstance } from "i18next";
import { renderToStaticMarkup } from "react-dom/server";
import { I18nextProvider } from "react-i18next";
import { ClientSearchInput } from "../../../components/ui/ClientSearchInput";
import fr from "../../../translations/fr.json";
import {
  DEFAULT_OPERATION_STATUSES,
  OperationFilters,
  OperationStatusMenu,
  operationFiltersFromQuery,
  operationMenuPosition,
} from "./OperationFilters";

const i18n = createInstance();
await i18n.init({ lng: "fr", resources: { fr: { translation: fr } } });

describe("operation grid filters", () => {
  it("keeps the overlay inside the viewport independently of the grid height", () => {
    expect(
      operationMenuPosition(
        { left: 100, bottom: 200 },
        { width: 800, height: 600 },
      ),
    ).toEqual({ width: 190, left: 100, top: 208, maxHeight: 384 });
    expect(
      operationMenuPosition(
        { left: 790, bottom: 590 },
        { width: 800, height: 600 },
      ),
    ).toEqual({ width: 190, left: 602, top: 480, maxHeight: 112 });
    expect(
      operationMenuPosition(
        { left: 180, bottom: 290 },
        { width: 200, height: 300 },
      ),
    ).toEqual({ width: 184, left: 8, top: 180, maxHeight: 112 });
  });
  it("defaults to all three active statuses and preserves sidebar selections", () => {
    expect(operationFiltersFromQuery("").statuses).toEqual(
      DEFAULT_OPERATION_STATUSES,
    );
    for (const status of DEFAULT_OPERATION_STATUSES) {
      expect(operationFiltersFromQuery(`?status=${status}`).statuses).toEqual([
        status,
      ]);
    }
    expect(
      operationFiltersFromQuery("?status=paid,cancelled&search=Ada+Lovelace"),
    ).toEqual({ statuses: ["paid", "cancelled"], search: "Ada Lovelace" });
    expect(operationFiltersFromQuery("?status=all").statuses).toEqual([]);
  });
  it("visibly selects default statuses and provides a client search and all statuses", () => {
    const html = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <OperationStatusMenu
          statuses={DEFAULT_OPERATION_STATUSES}
          onStatusesChange={() => {}}
        />
      </I18nextProvider>,
    );
    expect(html.match(/aria-checked="true"/g)).toHaveLength(3);
    for (const label of [
      "En attente",
      "En cours",
      "À payer",
      fr.status_paid,
      fr.status_cancelled,
    ]) {
      expect(html).toContain(label);
    }
    expect(html).toContain('role="menu"');
    expect(html).toContain('role="menuitemcheckbox"');
    expect(html).toContain("fixed z-50");
    expect(html).toContain("overflow-y-auto");
    expect(html.match(/role="menuitemcheckbox"/g)).toHaveLength(7);
    expect(html).not.toContain(fr.status_created);
  });
  it("visibly selects the single sidebar status", () => {
    const html = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <OperationStatusMenu
          statuses={["payment_pending"]}
          onStatusesChange={() => {}}
        />
      </I18nextProvider>,
    );
    expect(html.match(/aria-checked="true"/g)).toHaveLength(1);
    expect(html).toContain("À payer");
  });
  it("uses the users funnel trigger and indicates sidebar selections", () => {
    const html = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <OperationFilters
          statuses={["payment_pending"]}
          onStatusesChange={() => {}}
        />
      </I18nextProvider>,
    );
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain("À payer");
    expect(html).toContain("fill-current");
    expect(html).not.toContain('role="menuitemcheckbox"');
  });
  it("uses the shared 360 client search presentation", () => {
    const html = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <ClientSearchInput
          id="operation-client-search"
          value="Ada Lovelace"
          onChange={() => {}}
        />
      </I18nextProvider>,
    );
    expect(html).toContain("max-w-[30rem]");
    expect(html).toContain("lucide-search");
    expect(html).toContain('type="search"');
    expect(html).toContain('maxLength="50"');
    expect(html).toContain('value="Ada Lovelace"');
  });
});
