import { describe, expect, it } from "bun:test";
import { EMPTY_STORE_INFORMATION } from "../../store-information/types";
import {
  renderDocumentTemplate,
  renderDocumentTemplateFromData,
} from "./render";

describe("document templates", () => {
  it("uses A4 dimensions on screen and paginates long documents when printing", () => {
    for (const type of ["invoice", "quote"] as const) {
      for (const audience of ["client", "pro"] as const) {
        const html = renderDocumentTemplate(
          type,
          audience,
          EMPTY_STORE_INFORMATION,
        );
        expect(html).toContain(".sheet { width: 210mm; min-height: 297mm;");
        expect(html).toContain("@page { size: A4; margin: 0; }");
        expect(html).toContain("thead { display: table-header-group; }");
        expect(html).toContain("tr { break-inside: avoid; }");
      }
    }
  });

  it("uses saved store information in all preview templates", () => {
    const storeInformation = {
      name: "Ocazbike",
      address: "8 Avenue de Picot, 33320 Eysines",
      phone: "06 95 07 94 94",
      email: "ocazbike@example.fr",
      siret: "90768904600015",
      apeCode: "4649Z",
      vatNumber: "FR21907689046",
      bankName: "Crédit Agricole",
      iban: "FR761234",
      bic: "AGRIFRPP833",
    };

    for (const type of ["invoice", "quote"] as const) {
      for (const audience of ["client", "pro"] as const) {
        const html = renderDocumentTemplate(type, audience, storeInformation);
        expect(html).toContain("Ocazbike");
        expect(html).toContain("8 Avenue de Picot<br>33320 Eysines");
        expect(html).toContain("FR761234");
        expect(html).not.toContain("{{");
      }
    }

    expect(renderDocumentTemplate("quote", "pro", storeInformation)).toContain(
      "N° DEV20260007",
    );
  });

  it("renders a client and its billing document from typed API data", () => {
    const html = renderDocumentTemplateFromData("invoice", "pro", {
      storeInformation: {
        ...EMPTY_STORE_INFORMATION,
        name: "Ocazbike",
        bankName: "Crédit Agricole",
        iban: "FR761234",
        bic: "AGRIFRPP833",
      },
      client: {
        firstname: "Alex",
        lastname: "Durand",
        email: "alex@example.fr",
        phonenumber: "0600000000",
        address: "1 rue du Vélo, 33000 Bordeaux",
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
    expect(html).toContain("1 rue du Vélo<br>33000 Bordeaux");
    expect(html).toContain("&lt;img src=x&gt;");
    expect(html).toMatch(/100,00\s€/);
    expect(html).not.toContain("<img src=x>");
  });
});
