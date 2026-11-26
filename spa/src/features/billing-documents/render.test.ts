import { describe, expect, it } from "bun:test";
import { EMPTY_STORE_INFORMATION } from "../store-information/types";
import { addressToHtml } from "./format";
import {
  renderDocumentTemplate,
  renderDocumentTemplateFromData,
} from "./render";

describe("document templates", () => {
  it("adds line breaks before postal codes without losing adjacent address text", () => {
    expect(addressToHtml("2 Rue Pas Ici, 00000 Ville", "Bâtiment A")).toBe(
      "2 Rue Pas Ici<br>00000 Ville<br>Bâtiment A",
    );
    expect(addressToHtml("2 Rue Pas Ici\t00000 Ville")).toBe(
      "2 Rue Pas Ici<br>00000 Ville",
    );
  });

  it("uses A4 dimensions on screen and paginates long documents when printing", () => {
    for (const type of ["invoice", "quote"] as const) {
      for (const audience of ["client", "pro"] as const) {
        const html = renderDocumentTemplate(
          type,
          audience,
          EMPTY_STORE_INFORMATION,
        );
        expect(html).toContain(".sheet { width: 210mm; min-height: 297mm;");
        expect(html).toContain("@page { size: A4; margin: 15mm; }");
        expect(html).toMatch(
          /@media print \{[\s\S]*\.sheet \{[^}]*padding: 0;/,
        );
        expect(html).toContain("thead { display: table-header-group; }");
        expect(html).toContain("tr { break-inside: avoid; }");
      }
    }
  });

  it("shows the OCAZBIKE logo in every template header", () => {
    for (const type of ["invoice", "quote"] as const) {
      for (const audience of ["client", "pro"] as const) {
        const html = renderDocumentTemplate(
          type,
          audience,
          EMPTY_STORE_INFORMATION,
        );
        expect(html).toMatch(
          /<header class="topline">\s*<div class="brand-block">\s*<img class="logo" src="[^"]*ocazbike-logo[^"]*\.png" alt="OCAZBIKE"/,
        );
      }
    }
  });

  it("uses saved store information in all preview templates", () => {
    const storeInformation = {
      name: "EntrepriseInconnue",
      address: "2 Rue Pas Ici",
      phone: "06 00 00 00 00",
      secondaryPhone: "06 00 00 00 00",
      email: "ocazbike@example.fr",
      siret: "90768904600015",
      apeCode: "4649Z",
      vatNumber: "FR21907689046",
      bankName: "BanqueInconnue",
      iban: "FR861234",
      bic: "BIC_INCONNU",
    };

    for (const type of ["invoice", "quote"] as const) {
      for (const audience of ["client", "pro"] as const) {
        const html = renderDocumentTemplate(type, audience, storeInformation);
        expect(html).toContain('<p class="brand">EntrepriseInconnue</p>');
        expect(html).toContain("<strong>EntrepriseInconnue</strong>");
        expect(html).toContain("BanqueInconnue");
        expect(html).toContain("BIC_INCONNU");
        expect(html).toContain("06 00 00 00 00<br>06 00 00 00 00");
        expect(html).toContain("2 Rue Pas Ici");
        expect(html).toContain("FR861234");
        expect(html).not.toContain("{{");
      }
    }

    expect(renderDocumentTemplate("quote", "pro", storeInformation)).toContain(
      "N° DEV20260007",
    );
    expect(
      renderDocumentTemplate("invoice", "client", {
        ...storeInformation,
        secondaryPhone: "",
      }),
    ).not.toContain("06 00 00 00 00<br>06 00 00 00 00");
  });

  it("renders a client and its billing document from typed API data", () => {
    const html = renderDocumentTemplateFromData("invoice", "pro", {
      storeInformation: {
        ...EMPTY_STORE_INFORMATION,
        name: "EntrepriseInconnue",
        bankName: "BanqueInconnue",
        iban: "FR761234",
        bic: "BIC_INCONNU",
      },
      client: {
        firstname: "Alex",
        lastname: "Durand",
        email: "alex@example.fr",
        phonenumber: "06 00 00 00 00",
        address: "2 Rue Pas Ici",
        addressComplement: "Bâtiment A",
        isProfessional: true,
        companyName: "Atelier du Cycle",
        siret: "12345678900012",
        vatNumber: "FR12123456789",
      },
      billingDocument: {
        number: "FAC20260099",
        date: "2026-10-27T12:00:00Z",
        settledDate: "2026-10-27T12:00:00Z",
        lines: [
          {
            description: "<img src=x>",
            quantity: 1,
            unitPriceExcludingTax: 100,
            unitPriceIncludingTax: 120,
            total: 120,
          },
        ],
        subtotal: 100,
        taxTotal: 20,
        total: 120,
      },
    });

    expect(html).toContain("Atelier du Cycle");
    expect(html).toContain("FAC20260099");
    expect(html).toContain("27/10/2026");
    expect(html).toContain("2 Rue Pas Ici");
    expect(html).toContain("&lt;img src=x&gt;");
    expect(html).toMatch(/100,00\s€/);
    expect(html).not.toContain("<img src=x>");
  });
});
