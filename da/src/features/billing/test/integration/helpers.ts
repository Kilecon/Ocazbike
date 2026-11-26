import type { Mailer } from "../../../../shared/mail/Mailer";
import type { HtmlToPdfRenderer } from "../../../../shared/pdf/GotenbergPdfRenderer";
import { createClientIntegrationFixture } from "../../../clients/test/integration/helpers";

export function createBillingIntegrationFixture(
  name: string,
  options: { mailer?: Mailer; pdfRenderer?: HtmlToPdfRenderer } = {},
) {
  const fixture = createClientIntegrationFixture(name, options);
  return Object.assign(fixture, { repository: fixture.billingDocuments });
}
