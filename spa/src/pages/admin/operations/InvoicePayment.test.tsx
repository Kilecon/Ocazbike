import { describe, expect, it } from "bun:test";
import { createInstance } from "i18next";
import { renderToStaticMarkup } from "react-dom/server";
import { I18nextProvider } from "react-i18next";
import type { BillingSnapshotDTO } from "../../../services/types";
import en from "../../../translations/en.json";
import { InvoicePayment } from "./InvoicePayment";

const i18n = createInstance();
await i18n.init({
  lng: "en",
  resources: { en: { translation: en } },
  interpolation: { escapeValue: false },
});

function render(snapshots: BillingSnapshotDTO[]) {
  return renderToStaticMarkup(
    <I18nextProvider i18n={i18n}>
      <InvoicePayment operation={{ snapshots }} />
    </I18nextProvider>,
  );
}

describe("invoice payment display", () => {
  it("distinguishes missing invoices from invoices awaiting payment", () => {
    expect(render([])).toContain("Not invoiced");
    expect(
      render([
        {
          kind: "quote",
          status: "accepted",
          payload: {},
          createdAt: 0,
          updatedAt: 0,
        },
      ]),
    ).toContain("Not invoiced");
    const html = render([
      {
        kind: "invoice",
        status: "unpaid",
        payload: {},
        createdAt: 0,
        updatedAt: 0,
      },
    ]);
    expect(html).toContain(en.status_payment_pending);
    expect(html).not.toContain("Not invoiced");
  });

  it("reads settlement and payment method from the invoice including free invoices", () => {
    for (const paymentMethod of ["card", "free"] as const) {
      const html = render([
        {
          kind: "invoice",
          status: "paid",
          paymentMethod,
          paidAt: 100,
          payload: {},
          createdAt: 0,
          updatedAt: 100,
        },
      ]);
      expect(html).toContain(en.status_paid);
      expect(html).toContain(en[`payment_${paymentMethod}`]);
      expect(html).not.toContain(en.status_payment_pending);
    }
  });
});
