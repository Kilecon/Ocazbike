import type { StoreInformation } from "../../store-information/types";
import { previewData } from "./fixtures";
import {
  addressToHtml,
  escapeHtml,
  formatDocumentAmount,
  formatDocumentDate,
} from "./format";
import { invoiceClientTemplate } from "./templates/invoiceClient";
import { invoiceProTemplate } from "./templates/invoicePro";
import { quoteClientTemplate } from "./templates/quoteClient";
import { quoteProTemplate } from "./templates/quotePro";
import type {
  DocumentTemplateAudience,
  DocumentTemplateData,
  DocumentTemplateLine,
  DocumentTemplateType,
} from "./types";

export const documentTemplates: Record<
  DocumentTemplateType,
  Record<DocumentTemplateAudience, string>
> = {
  invoice: { client: invoiceClientTemplate, pro: invoiceProTemplate },
  quote: { client: quoteClientTemplate, pro: quoteProTemplate },
};

function storeInformationValues(
  information: StoreInformation,
): Readonly<Record<string, string>> {
  const legalDetails = information.siret
    ? `SIRET : ${escapeHtml(information.siret)}`
    : "";
  const vatDetails = information.vatNumber
    ? `N° TVA intracom : ${escapeHtml(information.vatNumber)}`
    : "";
  const consumerDetails = [
    information.siret && `SIRET : ${escapeHtml(information.siret)}`,
    information.apeCode && `APE : ${escapeHtml(information.apeCode)}`,
    information.vatNumber &&
      `N° TVA intracom : ${escapeHtml(information.vatNumber)}`,
  ]
    .filter(Boolean)
    .join(" · ");
  const consumerFooter = [consumerDetails, "Merci de votre confiance."]
    .filter(Boolean)
    .join(" · ");
  const bankDetails = [
    information.bankName && `<p>Nom : ${escapeHtml(information.bankName)}</p>`,
    information.iban && `<p>IBAN : ${escapeHtml(information.iban)}</p>`,
    information.bic && `<p>BIC : ${escapeHtml(information.bic)}</p>`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    company_name: escapeHtml(information.name),
    company_address: addressToHtml(information.address),
    company_phone: escapeHtml(information.phone),
    company_email: escapeHtml(information.email),
    company_legal_details: legalDetails,
    company_vat_details: vatDetails,
    company_vat_number: escapeHtml(information.vatNumber),
    company_invoice_footer: information.apeCode
      ? `APE : ${escapeHtml(information.apeCode)}`
      : "",
    company_consumer_legal_details: consumerDetails,
    company_consumer_footer: consumerFooter,
    company_bank_details: bankDetails,
  };
}

function renderTemplateValues(
  type: DocumentTemplateType,
  audience: DocumentTemplateAudience,
  values: Readonly<Record<string, string>>,
): string {
  return documentTemplates[type][audience].replace(
    /\{\{([a-z_]+)\}\}/g,
    (placeholder, key: string) => values[key] ?? placeholder,
  );
}

export function renderDocumentTemplate(
  type: DocumentTemplateType,
  audience: DocumentTemplateAudience,
  storeInformation: StoreInformation,
): string {
  return renderDocumentTemplateFromData(type, audience, {
    ...previewData[type][audience],
    storeInformation,
  });
}

function documentLineItems(lines: readonly DocumentTemplateLine[]): string {
  return lines
    .map(
      (line) => `
        <tr>
          <td>${escapeHtml(line.description)}</td>
          <td class="numeric">${escapeHtml(String(line.quantity))}</td>
          <td class="numeric">${formatDocumentAmount(line.unitPriceExcludingTax)}</td>
          <td class="numeric">${formatDocumentAmount(line.unitPriceIncludingTax)}</td>
          <td class="numeric">${formatDocumentAmount(line.total)}</td>
        </tr>`,
    )
    .join("");
}

export function renderDocumentTemplateFromData(
  type: DocumentTemplateType,
  audience: DocumentTemplateAudience,
  data: DocumentTemplateData,
): string {
  const { client, billingDocument, storeInformation } = data;
  if (client.isProfessional !== (audience === "pro")) {
    throw new Error("Document template audience does not match the client");
  }
  const clientName = `${client.firstname} ${client.lastname}`.trim();
  const purchase = billingDocument.operationType === "purchase";
  const paid =
    billingDocument.status === undefined || billingDocument.status === "paid";
  const paymentMethods = {
    card: "CB",
    cheque: "Chèque",
    bank_transfer: "Virement",
    cash: "Espèces",
    free: "Montant nul",
  };
  const storeValues = storeInformationValues(storeInformation);
  const values = {
    ...storeValues,
    document_title: purchase
      ? type === "quote"
        ? "Devis de rachat"
        : "Facture de rachat"
      : type === "quote"
        ? "Devis"
        : "Facture",
    company_role: purchase ? "Acheteur" : "Émetteur",
    client_role: purchase ? "Vendeur" : "Facturé à",
    payment_label: purchase
      ? "Paiement de l’acheteur au vendeur :"
      : "Modalité de paiement :",
    quote_payment_details: purchase
      ? "Chèque - Virement - Espèces"
      : "CB - Chèque - Virement",
    bank_details: purchase
      ? ""
      : `<p><strong>Coordonnées bancaires :</strong></p>${storeValues.company_bank_details}`,
    total_label: purchase
      ? type === "quote"
        ? "Montant de rachat estimé"
        : "Montant à verser au vendeur"
      : type === "quote"
        ? "Total TTC estimé"
        : audience === "pro"
          ? "Net à payer TTC"
          : "Total TTC",
    quote_notice: purchase
      ? `Ce devis de rachat est valable jusqu’au ${formatDocumentDate(billingDocument.validUntil)}. Après acceptation, ${escapeHtml(storeInformation.name)} achète les biens au vendeur indiqué et lui verse le montant convenu.`
      : `Ce devis est valable jusqu’au ${formatDocumentDate(billingDocument.validUntil)}. Les travaux et fournitures seront réalisés après acceptation du devis.`,
    document_number: escapeHtml(billingDocument.number),
    document_date: formatDocumentDate(billingDocument.date),
    settled_date: formatDocumentDate(
      billingDocument.settledDate ?? billingDocument.date,
    ),
    document_status:
      type === "invoice"
        ? paid
          ? "Acquittée"
          : purchase
            ? "À régler au vendeur"
            : "Non réglée"
        : billingDocument.status === "accepted"
          ? "Accepté"
          : billingDocument.status === "rejected"
            ? "Refusé"
            : "En attente d’acceptation",
    settled_details: paid
      ? `<p class="nowrap settled-date">Acquittée le : ${formatDocumentDate(billingDocument.settledDate ?? billingDocument.date)}</p>`
      : "",
    payment_details:
      billingDocument.status === undefined
        ? '<span class="payment-method settled">CB</span> - Chèque - Virement'
        : billingDocument.paymentMethod
          ? paymentMethods[billingDocument.paymentMethod]
          : purchase
            ? "À régler au vendeur"
            : "Non réglée",
    valid_until: formatDocumentDate(billingDocument.validUntil),
    line_items: documentLineItems(billingDocument.lines),
    subtotal: formatDocumentAmount(billingDocument.subtotal),
    tax_total: formatDocumentAmount(billingDocument.taxTotal),
    total: formatDocumentAmount(billingDocument.total),
    legal_notices: escapeHtml(billingDocument.legalNotices ?? ""),
    client_name: escapeHtml(clientName),
    client_company: escapeHtml(client.companyName ?? clientName),
    client_address: addressToHtml(client.address, client.addressComplement),
    client_phone: escapeHtml(client.phonenumber),
    client_email: escapeHtml(client.email),
    client_siret: escapeHtml(client.siret ?? ""),
    client_vat_number: escapeHtml(client.vatNumber ?? ""),
  };

  return renderTemplateValues(type, audience, values);
}
