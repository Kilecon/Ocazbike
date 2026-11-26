import { describe, expect, it } from "bun:test";
import { createInstance } from "i18next";
import { renderToStaticMarkup } from "react-dom/server";
import { I18nextProvider } from "react-i18next";
import { ClientSearchInput } from "@/features/clients/ClientSearchInput";
import fr from "@/shared/i18n/translations/fr.json";
import { FilterMenuList } from "@/shared/ui/FilterMenu";
import {
  OPERATION_TAB_STATUSES,
  OperationFilters,
  OperationStatusOptions,
  operationFiltersFromSearch,
  operationFiltersToSearch,
} from "./OperationFilters";
import { OperationTabs } from "./OperationTabs";

const i18n = createInstance();
await i18n.init({ lng: "fr", resources: { fr: { translation: fr } } });

describe("operation grid filters", () => {
  it("defaults to all operations and restores tabs and custom status filters", () => {
    expect(operationFiltersFromSearch({})).toEqual({
      tab: "all",
      statuses: [],
      search: "",
    });
    for (const status of OPERATION_TAB_STATUSES) {
      expect(operationFiltersFromSearch({ status })).toEqual({
        tab: status,
        statuses: [status],
        search: "",
      });
    }
    expect(
      operationFiltersFromSearch({
        status: "paid,cancelled",
        search: "Ada Lovelace",
      }),
    ).toEqual({
      tab: "all",
      statuses: ["paid", "cancelled"],
      search: "Ada Lovelace",
    });
    expect(
      operationFiltersFromSearch({ tab: "all", status: "pending" }),
    ).toEqual({
      tab: "all",
      statuses: ["pending"],
      search: "",
    });
    expect(operationFiltersFromSearch({ status: "all" }).statuses).toEqual([]);
  });
  it("serialises filters back to search params that round-trip", () => {
    expect(
      operationFiltersToSearch({ tab: "all", statuses: [], search: "" }),
    ).toEqual({ status: "all", tab: "all", search: undefined });
    const filters = {
      tab: "pending" as const,
      statuses: ["pending" as const],
      search: "Ada",
    };
    expect(
      operationFiltersFromSearch(operationFiltersToSearch(filters)),
    ).toEqual(filters);
  });
  it("renders accessible status tabs with exactly one selection", () => {
    const html = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <OperationTabs
          selected="payment_pending"
          id="operation-tabs"
          panelId="operation-panel"
          counts={{ pending: 5, in_progress: 2, payment_pending: 0 }}
          total={12}
          onSelect={() => {}}
        />
      </I18nextProvider>,
    );
    expect(html.match(/role="tab"/g)).toHaveLength(4);
    expect(html.match(/aria-selected="true"/g)).toHaveLength(1);
    expect(html).toContain('id="operation-tabs-payment_pending"');
    expect(html).toContain('aria-controls="operation-panel"');
    expect(html).toContain("Tous (12)");
    expect(html).toContain("En attente (5)");
    expect(html).toContain("En cours (2)");
    expect(html).toContain("À payer (0)");
    for (const label of [
      fr.operationFilterAll,
      fr.status_pending,
      fr.status_in_progress,
      fr.status_payment_pending,
    ]) {
      expect(html).toContain(label);
    }
  });
  it("allows custom selection of all statuses in the all tab", () => {
    const html = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <FilterMenuList label={fr.usersFilter}>
          <OperationStatusOptions
            statuses={[...OPERATION_TAB_STATUSES]}
            onStatusesChange={() => {}}
          />
        </FilterMenuList>
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
        <FilterMenuList label={fr.usersFilter}>
          <OperationStatusOptions
            statuses={["payment_pending"]}
            onStatusesChange={() => {}}
          />
        </FilterMenuList>
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
