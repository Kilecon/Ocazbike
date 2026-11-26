import { describe, expect, it } from "bun:test";
import type { Mailer, MailMessage } from "../../../../shared/mail/Mailer";
import { MailDeliveryError } from "../../../../shared/mail/Mailer";
import {
  type HtmlToPdfRenderer,
  PdfRenderingError,
} from "../../../../shared/pdf/GotenbergPdfRenderer";
import { accessTokenFrom } from "../../../../tests-helpers/authCookies";
import {
  EMPTY_STORE_INFORMATION,
  type StoreInformation,
} from "../../../store-information/model";
import { BillingDocumentEmailService } from "../../email/BillingDocumentEmailService";
import { InMemoryBillingEmailLog } from "../../email/IBillingEmailLog";
import { createBillingIntegrationFixture } from "./helpers";

class RecordingMailer implements Mailer {
  readonly messages: MailMessage[] = [];
  failNext = false;

  async send(message: MailMessage): Promise<void> {
    if (this.failNext) {
      this.failNext = false;
      throw new MailDeliveryError(new Error("SMTP down"));
    }
    this.messages.push(message);
  }
}

const quoteBody = (clientId: number, sendQuoteEmail: boolean) => ({
  clientId,
  type: "repair",
  date: "2026-01-05T10:00:00Z",
  createQuote: true,
  sendQuoteEmail,
  lines: [
    {
      description: "Révision complète",
      quantity: "1",
      unitPrice: "50",
      vatRate: "20",
      total: "60",
    },
  ],
});

async function setUp(
  name: string,
  mailer?: Mailer,
  pdfRenderer: HtmlToPdfRenderer = {
    render: async () => new TextEncoder().encode("%PDF-test"),
  },
) {
  const fixture = createBillingIntegrationFixture(name, {
    mailer,
    pdfRenderer,
  });
  await fixture.reset();
  const headers = {
    Cookie: `access_token=${accessTokenFrom(await fixture.login())}`,
    "Content-Type": "application/json",
  };
  const post = (path: string, body?: unknown) =>
    fixture.request(path, {
      method: "POST",
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  return { fixture, headers, post };
}

describe("billing document emails", () => {
  it("adds the shop signature to HTML and plain text using current store details", async () => {
    const mailer = new RecordingMailer();
    const { fixture, post } = await setUp("billing-email-signature", mailer);
    try {
      const client = await fixture.clients.create(
        { firstname: "Ada", lastname: "Lovelace", email: "ada@example.com" },
        fixture.admin.id,
      );
      const created = await (
        await post("/operations", quoteBody(client.id, false))
      ).json();
      const operation = await fixture.repository.getOperation(created.id);
      if (!operation) throw new Error("Missing operation");
      let store: StoreInformation = {
        ...EMPTY_STORE_INFORMATION,
        name: "Vélos & Co",
        address: "2 Rue Pas Ici",
        phone: "06 00 00 00 00",
        secondaryPhone: "06 00 00 00 00",
        email: "boutique@example.com",
      };
      let now = Date.UTC(2026, 0, 5);
      const service = new BillingDocumentEmailService(
        mailer,
        new InMemoryBillingEmailLog(),
        {
          get: async () => store,
          update: async (value) => {
            store = value;
            return store;
          },
        },
        () => now,
        { render: async () => new TextEncoder().encode("%PDF-test") },
      );
      await service.send(operation, "quote");
      const [message] = mailer.messages;
      expect(message?.replyTo).toBe("boutique@example.com");
      expect(message?.text).toContain(
        "VÉLOS & CO\nVente et Réparation de vélos\n2 Rue Pas Ici\nTél 06 00 00 00 00 / 06 00 00 00 00",
      );
      expect(message?.html).toStartWith(
        '<div style="font-family:Arial,sans-serif"><p>Bonjour Ada Lovelace,</p>',
      );
      expect(message?.html).toContain(
        '</p></div><div style="font-family:Arial,sans-serif;font-size:13px;line-height:20px;color:#888">',
      );
      expect(message?.html).toContain("color:#6aa84f");
      expect(message?.html).toContain(
        "VÉLOS &amp; CO</span><br>Vente et Réparation de vélos<br>2 Rue Pas Ici<br>Tél 06 00 00 00 00 / 06 00 00 00 00",
      );
      store = {
        ...EMPTY_STORE_INFORMATION,
        name: "Autre boutique",
        secondaryPhone: "06 00 00 00 00",
      };
      now = Date.UTC(2026, 0, 6);
      await service.send(operation, "quote");
      expect(mailer.messages[1]?.text).toContain(
        "AUTRE BOUTIQUE\nVente et Réparation de vélos\nTél 06 00 00 00 00",
      );
      expect(mailer.messages[1]?.text).not.toContain(" / ");
    } finally {
      fixture.cleanup();
    }
  });

  it("does not send an email when PDF conversion fails and permits a retry", async () => {
    const mailer = new RecordingMailer();
    let fail = true;
    const { fixture, post } = await setUp(
      "billing-email-render-failure",
      mailer,
      {
        async render() {
          if (fail) throw new PdfRenderingError("Chromium unavailable");
          return new TextEncoder().encode("%PDF-retry");
        },
      },
    );
    try {
      const client = await fixture.clients.create(
        { firstname: "Ada", lastname: "Lovelace", email: "ada@example.com" },
        fixture.admin.id,
      );
      const response = await post("/operations", quoteBody(client.id, true));
      expect(response.status).toBe(201);
      const operation = await response.json();
      expect(operation.email).toMatchObject({
        status: "failed",
        code: "EMAIL_DELIVERY_FAILED",
      });
      expect(operation.snapshots[0].emailSentAt).toBeNull();
      expect(mailer.messages).toHaveLength(0);
      const failedRetry = await post(`/operations/${operation.id}/emails`, {
        kind: "quote",
      });
      expect(failedRetry.status).toBe(502);
      expect(await failedRetry.json()).toMatchObject({
        code: "EMAIL_DELIVERY_FAILED",
      });
      expect(mailer.messages).toHaveLength(0);
      fail = false;
      const retry = await post(`/operations/${operation.id}/emails`, {
        kind: "quote",
      });
      expect(retry.status).toBe(200);
      expect(mailer.messages).toHaveLength(1);
      const afterSuccess = await post(`/operations/${operation.id}/emails`, {
        kind: "quote",
      });
      expect(afterSuccess.status).toBe(429);
      expect(await afterSuccess.json()).toMatchObject({
        code: "EMAIL_ALREADY_SENT_TODAY",
      });
    } finally {
      fixture.cleanup();
    }
  });

  it("emails the quote PDF on creation and limits resends to one per day", async () => {
    const mailer = new RecordingMailer();
    const { fixture, headers, post } = await setUp(
      "billing-email-quote",
      mailer,
    );
    try {
      const client = await fixture.clients.create(
        { firstname: "Ada", lastname: "Lovelace", email: "ada@example.com" },
        fixture.admin.id,
      );
      const created = await post("/operations", quoteBody(client.id, true));
      expect(created.status).toBe(201);
      const operation = await created.json();
      expect(operation.email).toMatchObject({ status: "sent", kind: "quote" });
      expect(operation.snapshots[0].emailSentAt).toBe(operation.email.sentAt);

      expect(mailer.messages).toHaveLength(1);
      const [message] = mailer.messages;
      expect(message?.to).toBe("ada@example.com");
      expect(message?.text).toContain("OCAZBIKE\nVente et Réparation de vélos");
      expect(message?.text).not.toContain("Tél ");
      expect(message?.subject).toContain(
        operation.snapshots[0].payload.documentNumber,
      );
      const attachment = message?.attachments?.[0];
      expect(attachment?.contentType).toBe("application/pdf");
      expect(
        Buffer.from(attachment?.content ?? [])
          .subarray(0, 5)
          .toString(),
      ).toBe("%PDF-");

      const resend = await post(`/operations/${operation.id}/emails`, {
        kind: "quote",
      });
      expect(resend.status).toBe(429);
      expect(await resend.json()).toMatchObject({
        code: "EMAIL_ALREADY_SENT_TODAY",
      });
      expect(mailer.messages).toHaveLength(1);

      const missingInvoice = await post(`/operations/${operation.id}/emails`, {
        kind: "invoice",
      });
      expect(missingInvoice.status).toBe(404);
      expect(await missingInvoice.json()).toMatchObject({
        code: "DOCUMENT_NOT_FOUND",
      });

      const list = await fixture.request("/operations", { headers });
      const [listed] = (await list.json()).operations;
      expect(listed.snapshots[0].emailSentAt).toBe(operation.email.sentAt);
    } finally {
      fixture.cleanup();
    }
  });

  it("creates the quote but refuses to email a client without an address", async () => {
    const mailer = new RecordingMailer();
    const { fixture, post } = await setUp("billing-email-missing", mailer);
    try {
      const client = await fixture.clients.create(
        { firstname: "Sans", lastname: "Courriel", email: "" },
        fixture.admin.id,
      );
      const created = await post("/operations", quoteBody(client.id, true));
      expect(created.status).toBe(201);
      const operation = await created.json();
      expect(operation.status).toBe("pending");
      expect(operation.email).toMatchObject({
        status: "failed",
        code: "CLIENT_EMAIL_MISSING",
      });
      expect(operation.snapshots[0].emailSentAt).toBeNull();

      const resend = await post(`/operations/${operation.id}/emails`, {
        kind: "quote",
      });
      expect(resend.status).toBe(422);
      expect(mailer.messages).toHaveLength(0);
    } finally {
      fixture.cleanup();
    }
  });

  it("emails the paid invoice and allows a retry after a delivery failure", async () => {
    const mailer = new RecordingMailer();
    const { fixture, post } = await setUp("billing-email-invoice", mailer);
    try {
      const client = await fixture.clients.create(
        { firstname: "Ada", lastname: "Lovelace", email: "ada@example.com" },
        fixture.admin.id,
      );
      const operation = await (
        await post("/operations", quoteBody(client.id, false))
      ).json();
      expect(operation.email).toBeUndefined();
      expect((await post(`/operations/${operation.id}/accept`)).status).toBe(
        200,
      );
      expect((await post(`/operations/${operation.id}/complete`)).status).toBe(
        200,
      );

      mailer.failNext = true;
      const paid = await post(`/operations/${operation.id}/pay`, {
        method: "card",
        sendInvoiceEmail: true,
      });
      expect(paid.status).toBe(200);
      const paidOperation = await paid.json();
      expect(paidOperation.status).toBe("paid");
      expect(paidOperation.email).toMatchObject({
        status: "failed",
        code: "EMAIL_DELIVERY_FAILED",
      });

      mailer.failNext = true;
      const failedRetry = await post(`/operations/${operation.id}/emails`, {
        kind: "invoice",
      });
      expect(failedRetry.status).toBe(502);
      expect(await failedRetry.json()).toMatchObject({
        code: "EMAIL_DELIVERY_FAILED",
      });
      expect(mailer.messages).toHaveLength(0);

      const retry = await post(`/operations/${operation.id}/emails`, {
        kind: "invoice",
      });
      expect(retry.status).toBe(200);
      expect(await retry.json()).toMatchObject({ kind: "invoice" });
      expect(mailer.messages.map(({ subject }) => subject)).toEqual([
        expect.stringContaining("Votre facture FAC"),
      ]);
    } finally {
      fixture.cleanup();
    }
  });

  it("reports an unconfigured SMTP server", async () => {
    const { fixture, post } = await setUp("billing-email-unconfigured");
    try {
      const client = await fixture.clients.create(
        { firstname: "Ada", lastname: "Lovelace", email: "ada@example.com" },
        fixture.admin.id,
      );
      const operation = await (
        await post("/operations", quoteBody(client.id, false))
      ).json();
      const response = await post(`/operations/${operation.id}/emails`, {
        kind: "quote",
      });
      expect(response.status).toBe(503);
      expect(await response.json()).toMatchObject({
        code: "EMAIL_NOT_CONFIGURED",
      });
    } finally {
      fixture.cleanup();
    }
  });
});
