import { describe, expect, it } from "bun:test";
import { createInstance } from "i18next";
import { renderToStaticMarkup } from "react-dom/server";
import { I18nextProvider } from "react-i18next";
import { AdminToastProvider } from "../../../components/admin/AdminToast";
import type { BillingOperationDTO } from "../../../services/types";
import fr from "../../../translations/fr.json";
import { CreateOperationForm, OperationDetail } from "./OperationsPage";

const i18n = createInstance();
await i18n.init({ lng: "fr", resources: { fr: { translation: fr } } });

const operation: BillingOperationDTO = {
  id: 42,
  clientId: 1,
  type: "rental",
  date: Date.UTC(2026, 9, 1, 12),
  serviceStartAt: Date.UTC(2026, 9, 2, 12),
  serviceEndAt: Date.UTC(2026, 9, 8, 12),
  comment: "Location prévue",
  status: "in_progress",
  paymentMethod: null,
  paidAt: null,
  lines: [
    {
      id: 1,
      billingDocumentId: 42,
      description: "Vélo",
      quantity: "1",
      unitPrice: "10",
      vatRate: "0",
      discount: "0",
      total: "10",
    },
  ],
  client: {
    id: 1,
    firstname: "Ada",
    lastname: "Lovelace",
    email: "ada@example.test",
    phonenumber: "",
    address: null,
    addressComplement: null,
    isProfessional: false,
    companyName: null,
    siret: null,
  },
  snapshots: [
    {
      kind: "quote",
      status: "accepted",
      createdAt: Date.UTC(2026, 9, 1, 12),
      updatedAt: Date.UTC(2026, 9, 1, 13),
      payload: {},
    },
  ],
};

function renderDetail(value: BillingOperationDTO) {
  return renderToStaticMarkup(
    <I18nextProvider i18n={i18n}>
      <OperationDetail
        operation={value}
        loading={false}
        saving={false}
        title="Locations"
        language="fr"
        onBack={() => {}}
        onAction={async () => {}}
        onReload={async () => {}}
      />
    </I18nextProvider>,
  );
}

describe("rental repair-style UI", () => {
  it.each(["repair", "sale", "purchase", "rental"] as const)(
    "displays saved service dates for %s ahead of automatic dates",
    (type) => {
      const html = renderDetail({ ...operation, type });
      expect(html).toContain("02/10/2026");
      expect(html).toContain("08/10/2026");
    },
  );
  it("defaults to an optional quote and keeps both planned rental dates required", () => {
    const html = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <AdminToastProvider>
          <CreateOperationForm
            type="rental"
            saving={false}
            onCancel={() => {}}
            onSubmit={async () => {}}
          />
        </AdminToastProvider>
      </I18nextProvider>,
    );
    expect(html).toMatch(
      /id="operation-create-quote"[^>]*type="checkbox"[^>]*checked=""/,
    );
    expect(html).toMatch(/id="operation-service-start"[^>]*required=""/);
    expect(html).toMatch(/id="operation-service-end"[^>]*required=""/);
    expect(html).toContain("Créer la location");
    expect(html).toContain('rows="6"');
  });

  it("shows separate planned and actual dates, document tabs and completion after Close", () => {
    const html = renderDetail(operation);
    expect(html).toContain("Création: 01/10/2026");
    expect(html).toContain("Clôture: —");
    expect(html).toContain("02/10/2026");
    expect(html).toContain("08/10/2026");
    expect(html).not.toContain("12:00");
    expect(html).toContain('href="/admin/rentals/42/documents/quote"');
    expect(html).toContain('target="_blank"');
    expect(html).not.toContain("Retour à la liste");
    expect(html.indexOf("Fermer")).toBeLessThan(html.indexOf("Terminer"));
    expect(html).toContain("flex flex-wrap items-end justify-end gap-3");
  });

  it("uses invoice payment for closure without overwriting the planned period", () => {
    const html = renderDetail({
      ...operation,
      status: "paid",
      snapshots: [
        ...operation.snapshots,
        {
          kind: "invoice",
          status: "paid",
          createdAt: Date.UTC(2026, 9, 10, 12),
          updatedAt: Date.UTC(2026, 9, 31, 12),
          paidAt: Date.UTC(2026, 9, 31, 12),
          paymentMethod: "cash",
          payload: {},
        },
      ],
    });
    expect(html).toContain("Clôture: 31/10/2026");
    expect(html).toContain("02/10/2026");
    expect(html).toContain("08/10/2026");
    expect(html).toContain('href="/admin/rentals/42/documents/invoice"');
    expect(html).not.toContain(">Terminer<");
  });
});
