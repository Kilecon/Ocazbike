import type { StoreInformation } from "../../store-information/types";

export type DocumentTemplateType = "invoice" | "quote";
export type DocumentTemplateAudience = "client" | "pro";

export interface DocumentTemplateClient {
  firstname: string;
  lastname: string;
  email: string;
  phonenumber: string;
  address: string | null;
  addressComplement: string | null;
  isProfessional: boolean;
  companyName: string | null;
  siret: string | null;
  vatNumber: string | null;
}

export interface DocumentTemplateLine {
  description: string;
  quantity: number | string;
  unitPriceExcludingTax: number | string;
  unitPriceIncludingTax: number | string;
  total: number | string;
}

export interface DocumentTemplateBillingDocument {
  operationType?: "repair" | "purchase" | "sale" | "rental";
  number: string;
  date: string | number;
  settledDate?: string | number | null;
  validUntil?: string | number | null;
  lines: readonly DocumentTemplateLine[];
  subtotal: number | string;
  taxTotal: number | string;
  total: number | string;
  legalNotices?: string;
  status?: string;
  paymentMethod?: "card" | "cheque" | "bank_transfer" | "cash" | "free" | null;
}

export interface DocumentTemplateData {
  storeInformation: StoreInformation;
  client: DocumentTemplateClient;
  billingDocument: DocumentTemplateBillingDocument;
}

export type DocumentTemplatePreviewData = Omit<
  DocumentTemplateData,
  "storeInformation"
>;
