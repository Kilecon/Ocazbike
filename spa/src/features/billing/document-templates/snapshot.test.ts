import { describe, expect, it } from "bun:test";
import type { BillingSnapshotDTO } from "../../../services/types";
import { EMPTY_STORE_INFORMATION } from "../../store-information/types";
import { renderDocumentTemplateFromData } from "./render";
import { documentDataFromSnapshot } from "./snapshot";

const snapshot: BillingSnapshotDTO = {
  kind: "invoice",
  status: "unpaid",
  createdAt: 1793444400000,
  updatedAt: 1793444400000,
  paymentMethod: null,
  paidAt: null,
  payload: {
    documentNumber: "FAC202600042",
    date: 1793444400000,
    comment: "Révision <script>alert(1)</script>",
    client: {
      firstname: "Ada",
      lastname: "Lovelace",
      email: "ada@example.test",
      phonenumber: "0600000000",
      address: "1 rue du Cycle",
      addressComplement: null,
      isProfessional: false,
      companyName: null,
      siret: null,
    },
    lines: [
      {
        description: "Révision <img src=x>",
        quantity: "1",
        unitPrice: "50.00",
        vatRate: "20",
        total: "60.00",
      },
      {
        description: "Remise",
        quantity: "1",
        unitPrice: "-10.00",
        vatRate: "20",
        total: "-12.00",
      },
    ],
  },
};

describe("saved billing document rendering", () => {
  it("identifies the client as seller and the store as buyer on buyback quotes and invoices", () => {
    for (const kind of ["quote", "invoice"] as const) {
      for (const isProfessional of [false, true]) {
        for (const status of kind === "quote"
          ? ["pending", "accepted", "rejected"]
          : ["unpaid", "paid"]) {
          const data = documentDataFromSnapshot(
            {
              ...snapshot,
              kind,
              status,
              paymentMethod: status === "paid" ? "bank_transfer" : null,
              payload: {
                ...snapshot.payload,
                type: "purchase",
                validUntil: Date.UTC(2026, 10, 30, 12),
                client: {
                  ...(snapshot.payload.client as Record<string, unknown>),
                  isProfessional,
                  companyName: isProfessional ? "Atelier vendeur" : null,
                  siret: isProfessional ? "12345678900012" : null,
                },
              },
            },
            {
              ...EMPTY_STORE_INFORMATION,
              name: "Ocazbike <test>",
              iban: "BUYER-IBAN",
            },
          );
          expect(data.billingDocument.operationType).toBe("purchase");
          const html = renderDocumentTemplateFromData(
            kind,
            isProfessional ? "pro" : "client",
            data,
          );
          expect(html).toContain(
            kind === "quote"
              ? "<h1>Devis de rachat</h1>"
              : "<h1>Facture de rachat</h1>",
          );
          expect(html).toMatch(
            /<h2>Acheteur<\/h2>\s*<p><strong>Ocazbike &lt;test&gt;<\/strong>/,
          );
          expect(html).toMatch(
            new RegExp(
              `<h2>Vendeur</h2>\\s*<p><strong>${isProfessional ? "Atelier vendeur" : "Ada Lovelace"}</strong>`,
            ),
          );
          expect(html).toContain("Paiement de l’acheteur au vendeur");
          expect(html).not.toContain("Facturé à");
          expect(html).not.toContain("BUYER-IBAN");
          expect(html).not.toContain("Coordonnées bancaires");
          expect(html).not.toContain("{{");
          expect(html).toContain("@page { size: A4;");
          if (kind === "quote") {
            expect(html).toContain("achète les biens au vendeur indiqué");
            expect(html).toContain("Montant de rachat estimé");
            expect(html).not.toContain("Les travaux et fournitures");
          } else {
            expect(html).toContain("Montant à verser au vendeur");
            expect(html).toContain(
              status === "paid" ? "Acquittée" : "À régler au vendeur",
            );
          }
        }
      }
    }
  });

  it("preserves customer billing for other operation types and legacy snapshots", () => {
    for (const operationType of ["repair", "sale", "rental", undefined]) {
      const data = documentDataFromSnapshot(
        {
          ...snapshot,
          payload: {
            ...snapshot.payload,
            ...(operationType ? { type: operationType } : {}),
          },
        },
        { ...EMPTY_STORE_INFORMATION, name: "Ocazbike", iban: "STORE-IBAN" },
      );
      const html = renderDocumentTemplateFromData("invoice", "client", data);
      expect(html).toContain("<h1>Facture</h1>");
      expect(html).toContain("<h2>Émetteur</h2>");
      expect(html).toContain("<h2>Facturé à</h2>");
      expect(html).toContain("STORE-IBAN");
      expect(html).toContain("Non réglée");
      expect(html).not.toContain("Montant à verser au vendeur");
    }
  });

  it("uses saved client, lines, discounts and totals and never marks unpaid invoices as paid", () => {
    const data = documentDataFromSnapshot(snapshot, EMPTY_STORE_INFORMATION);
    expect(data.billingDocument).toMatchObject({
      number: "FAC202600042",
      subtotal: "40.00",
      taxTotal: "8.00",
      total: "48.00",
    });
    const html = renderDocumentTemplateFromData("invoice", "client", data);
    expect(html).toContain("FAC202600042");
    expect(html).toContain("Ada Lovelace");
    expect(html).toContain("Non réglée");
    expect(html).not.toContain("Acquittée le");
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&lt;img src=x&gt;");
    expect(html).not.toContain("{{");
  });

  it("uses current payment metadata outside the immutable JSON", () => {
    const data = documentDataFromSnapshot(
      {
        ...snapshot,
        status: "paid",
        paymentMethod: "free",
        paidAt: 1793530800000,
      },
      EMPTY_STORE_INFORMATION,
    );
    const html = renderDocumentTemplateFromData("invoice", "client", data);
    expect(html).toContain("Acquittée");
    expect(html).toContain("Montant nul");
    expect(html).toContain("Acquittée le");
  });

  it("renders accepted and rejected quote statuses for both audiences", () => {
    for (const isProfessional of [false, true]) {
      for (const status of ["accepted", "rejected"]) {
        const client = snapshot.payload.client as Record<string, unknown>;
        const data = documentDataFromSnapshot(
          {
            ...snapshot,
            kind: "quote",
            status,
            payload: {
              ...snapshot.payload,
              validUntil: Date.UTC(2026, 10, 30, 12),
              client: { ...client, isProfessional },
            },
          },
          EMPTY_STORE_INFORMATION,
        );
        const html = renderDocumentTemplateFromData(
          "quote",
          isProfessional ? "pro" : "client",
          data,
        );
        expect(html).toContain(status === "accepted" ? "Accepté" : "Refusé");
        expect(html).toContain("Valable jusqu’au : 30/11/2026");
        expect(html).not.toContain("{{");
      }
    }
  });

  it("rejects malformed saved documents rather than substituting live or preview data", () => {
    for (const payload of [
      { ...snapshot.payload, client: null },
      {
        ...snapshot.payload,
        lines: [
          {
            description: "Invalid",
            quantity: "1",
            unitPrice: "x",
            vatRate: "20",
            total: "1",
          },
        ],
      },
      { ...snapshot.payload, date: "invalid" },
      { ...snapshot.payload, validUntil: "invalid" },
      { ...snapshot.payload, type: "invalid" },
    ]) {
      expect(() =>
        documentDataFromSnapshot(
          { ...snapshot, payload },
          EMPTY_STORE_INFORMATION,
        ),
      ).toThrow();
    }
  });
});
