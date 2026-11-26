import { readFileSync } from "node:fs";
import {
  formatDocumentAmount,
  formatDocumentDate,
} from "../../../../../spa/src/features/billing-documents/format";
import { renderDocumentTemplateFromData } from "../../../../../spa/src/features/billing-documents/render";
import { documentDataFromSnapshot } from "../../../../../spa/src/features/billing-documents/snapshot";
import { documentLogo } from "../../../../../spa/src/features/billing-documents/templates/layout";
import type { HtmlToPdfRenderer } from "../../../shared/pdf/GotenbergPdfRenderer";
import type { StoreInformation } from "../../store-information/model";
import type { BillingDocumentSnapshot } from "../IBillingDocumentRepository";

const logo = readFileSync(
  new URL(
    "../../../../../spa/public/assets/ocazbike-logo.png",
    import.meta.url,
  ),
).toString("base64");
const embeddedLogo = documentLogo.replace(
  /src="[^"]*"/,
  `src="data:image/png;base64,${logo}"`,
);

export const formatPdfAmount = formatDocumentAmount;
export function formatPdfDate(value: unknown): string {
  if (
    value !== null &&
    value !== undefined &&
    typeof value !== "number" &&
    typeof value !== "string"
  ) {
    throw new TypeError("Invalid billing document date");
  }
  return formatDocumentDate(value);
}

export function billingDocumentNumber(
  snapshot: BillingDocumentSnapshot,
): string {
  const number = snapshot.payload.documentNumber;
  if (typeof number !== "string") {
    throw new TypeError("Invalid billing document number");
  }
  return number;
}

export function renderBillingDocumentHtml(
  snapshot: BillingDocumentSnapshot,
  store: StoreInformation,
): string {
  const data = documentDataFromSnapshot(snapshot, store);
  return renderDocumentTemplateFromData(
    snapshot.kind,
    data.client.isProfessional ? "pro" : "client",
    data,
  ).replace(documentLogo, embeddedLogo);
}

export function renderBillingDocumentPdf(
  snapshot: BillingDocumentSnapshot,
  store: StoreInformation,
  renderer: HtmlToPdfRenderer,
): Promise<Uint8Array> {
  return renderer.render(renderBillingDocumentHtml(snapshot, store));
}
