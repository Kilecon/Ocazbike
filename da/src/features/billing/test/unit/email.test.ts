import { describe, expect, it } from "bun:test";
import { renderDocumentTemplateFromData } from "../../../../../../spa/src/features/billing-documents/render";
import { documentDataFromSnapshot } from "../../../../../../spa/src/features/billing-documents/snapshot";
import { documentLogo } from "../../../../../../spa/src/features/billing-documents/templates/layout";
import { loadSmtpConfig } from "../../../../shared/mail/SmtpMailer";
import {
  GotenbergPdfRenderer,
  PdfRenderingError,
} from "../../../../shared/pdf/GotenbergPdfRenderer";
import { EMPTY_STORE_INFORMATION } from "../../../store-information/model";
import { billingEmailDay } from "../../email/BillingDocumentEmailService";
import {
  renderBillingDocumentHtml,
  renderBillingDocumentPdf,
} from "../../email/renderBillingDocumentPdf";
import type { BillingDocumentSnapshot } from "../../IBillingDocumentRepository";

function snapshot(
  kind: "quote" | "invoice",
  professional: boolean,
): BillingDocumentSnapshot {
  return {
    kind,
    status: kind === "quote" ? "accepted" : "paid",
    createdAt: 0,
    updatedAt: 0,
    paidAt: Date.UTC(2026, 0, 6),
    paymentMethod: "bank_transfer",
    payload: {
      documentNumber: `${kind}-2026-42`,
      type: "purchase",
      date: Date.UTC(2026, 0, 5),
      validUntil: Date.UTC(2026, 1, 5),
      comment: "Merci <script>interdit</script>",
      client: {
        firstname: "Zoé",
        lastname: "Martin",
        email: "zoe@example.test",
        phonenumber: "",
        address: "2 Rue Pas Ici",
        isProfessional: professional,
        companyName: professional ? "Vélos & Co" : null,
        siret: professional ? "12345678900012" : null,
        vatNumber: professional ? "FR123456789" : null,
      },
      lines: [
        {
          description: "Révision & réglage <complet>",
          quantity: "2",
          unitPrice: "50",
          vatRate: "20",
          total: "120",
        },
      ],
    },
  };
}

describe("billing email configuration", () => {
  it("loads Mailpit and Gmail with the same TLS + app password settings", () => {
    expect(loadSmtpConfig({})).toBeNull();
    expect(
      loadSmtpConfig({
        SMTP_HOST: "mailpit",
        SMTP_PORT: "1025",
        SMTP_SECURE: "true",
        SMTP_TLS_REJECT_UNAUTHORIZED: "false",
        SMTP_USER: "ocazbike",
        SMTP_PASSWORD: "mailpit-password",
        SMTP_FROM: "Ocazbike <noreply@ocazbike.test>",
      }),
    ).toEqual({
      host: "mailpit",
      port: 1025,
      secure: true,
      rejectUnauthorized: false,
      user: "ocazbike",
      password: "mailpit-password",
      from: "Ocazbike <noreply@ocazbike.test>",
    });

    expect(
      loadSmtpConfig({
        SMTP_HOST: "smtp.gmail.com",
        SMTP_SECURE: "true",
        SMTP_USER: "shop@gmail.com",
        SMTP_PASSWORD: "abcd efgh ijkl mnop",
      }),
    ).toMatchObject({
      port: 465,
      secure: true,
      rejectUnauthorized: true,
      from: "shop@gmail.com",
    });
    expect(() =>
      loadSmtpConfig({
        SMTP_HOST: "smtp.gmail.com",
        SMTP_USER: "shop@gmail.com",
      }),
    ).toThrow("SMTP_USER and SMTP_PASSWORD");
  });

  it("counts the daily limit in the Paris calendar day", () => {
    expect(billingEmailDay(Date.UTC(2026, 0, 5, 22, 59))).toBe("2026-01-05");
    expect(billingEmailDay(Date.UTC(2026, 0, 5, 23, 0))).toBe("2026-01-06");
    expect(billingEmailDay(Date.UTC(2026, 6, 5, 21, 59))).toBe("2026-07-05");
    expect(billingEmailDay(Date.UTC(2026, 6, 5, 22, 0))).toBe("2026-07-06");
  });
});

describe("HTML billing PDFs", () => {
  it("prints the exact SPA templates for quotes and invoices, for both audiences", async () => {
    for (const kind of ["quote", "invoice"] as const) {
      for (const professional of [false, true]) {
        const document = snapshot(kind, professional);
        const store = {
          ...EMPTY_STORE_INFORMATION,
          name: "EntrepriseInconnue",
        };
        const expected = renderDocumentTemplateFromData(
          kind,
          professional ? "pro" : "client",
          documentDataFromSnapshot(document, store),
        );
        const html = renderBillingDocumentHtml(document, store);
        expect(html.replace(/<img class="logo"[^>]*>/, documentLogo)).toBe(
          expected,
        );
        expect(html).toContain('src="data:image/png;base64,');
        expect(html).not.toContain("<script>");
        expect(html).not.toContain("{{");
        let renderedHtml = "";
        const pdf = new TextEncoder().encode("%PDF-rendered");
        expect(
          await renderBillingDocumentPdf(document, store, {
            render: async (value) => {
              renderedHtml = value;
              return pdf;
            },
          }),
        ).toBe(pdf);
        expect(renderedHtml).toBe(html);
      }
    }
  });

  it("uses print CSS, exact page size and colored backgrounds in the conversion request", async () => {
    let received: FormData | undefined;
    let path = "";
    const server = Bun.serve({
      hostname: "127.0.0.1",
      port: 0,
      async fetch(request) {
        path = new URL(request.url).pathname;
        received = await request.formData();
        return new Response("%PDF-test", {
          headers: { "Content-Type": "application/pdf" },
        });
      },
    });
    try {
      const html = renderBillingDocumentHtml(
        snapshot("invoice", true),
        EMPTY_STORE_INFORMATION,
      );
      const result = await new GotenbergPdfRenderer(
        server.url.toString(),
      ).render(html);
      expect(new TextDecoder().decode(result)).toBe("%PDF-test");
      expect(path).toBe("/forms/chromium/convert/html");
      expect(received?.get("preferCssPageSize")).toBe("true");
      expect(received?.get("printBackground")).toBe("true");
      expect(received?.get("emulatedMediaType")).toBe("print");
      const file = received?.get("files");
      if (!(file instanceof File)) throw new Error("Missing HTML upload");
      expect(file.name).toBe("index.html");
      expect(await file.text()).toBe(html);
    } finally {
      server.stop(true);
    }
  });

  it("refuses unavailable renderers and success responses that are not PDFs", async () => {
    for (const response of [
      new Response("unavailable", { status: 503 }),
      new Response("<html>error</html>", {
        headers: { "Content-Type": "text/html" },
      }),
      new Response("not a pdf", {
        headers: { "Content-Type": "application/pdf" },
      }),
    ]) {
      const server = Bun.serve({
        hostname: "127.0.0.1",
        port: 0,
        fetch: () => response,
      });
      try {
        await expect(
          new GotenbergPdfRenderer(server.url.toString()).render(
            "<html></html>",
          ),
        ).rejects.toBeInstanceOf(PdfRenderingError);
      } finally {
        server.stop(true);
      }
    }
  });
});
