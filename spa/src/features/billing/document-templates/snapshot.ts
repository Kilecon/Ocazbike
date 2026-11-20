import type { BillingSnapshotDTO } from "../../../services/types";
import type { StoreInformation } from "../../store-information/types";
import type { DocumentTemplateData } from "./types";

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid billing document data");
  }
  return value as Record<string, unknown>;
}

function text(value: unknown): string {
  if (typeof value !== "string")
    throw new Error("Invalid billing document text");
  return value;
}

function nullableText(value: unknown): string | null {
  return value === null || value === undefined ? null : text(value);
}

function amount(value: unknown): number {
  const result = Number(text(value));
  if (!Number.isFinite(result) || String(value).trim() === "") {
    throw new Error("Invalid billing document amount");
  }
  return result;
}

export function documentDataFromSnapshot(
  snapshot: BillingSnapshotDTO,
  storeInformation: StoreInformation,
): DocumentTemplateData {
  const { payload } = snapshot;
  const operationType = payload.type;
  if (
    operationType !== undefined &&
    operationType !== "repair" &&
    operationType !== "purchase" &&
    operationType !== "sale" &&
    operationType !== "rental"
  ) {
    throw new Error("Invalid billing document operation type");
  }
  const client = record(payload.client);
  if (
    typeof client.isProfessional !== "boolean" ||
    !Array.isArray(payload.lines)
  ) {
    throw new Error("Invalid billing document client or lines");
  }
  let subtotalCents = 0;
  let totalCents = 0;
  const lines = payload.lines.map((value: unknown) => {
    const line = record(value);
    const quantity = amount(line.quantity);
    const unitPrice = amount(line.unitPrice);
    const vat = amount(line.vatRate);
    const total = amount(line.total);
    if (quantity <= 0 || vat < 0 || vat > 100) {
      throw new Error("Invalid billing document quantity or VAT");
    }
    const totalExcludingTax = total / (1 + vat / 100);
    subtotalCents += Math.round(totalExcludingTax * 100);
    totalCents += Math.round(total * 100);
    return {
      description: text(line.description),
      quantity,
      unitPriceExcludingTax: unitPrice,
      unitPriceIncludingTax: (unitPrice * (1 + vat / 100)).toFixed(2),
      total: total.toFixed(2),
    };
  });
  const date = payload.date;
  if (
    (typeof date !== "number" && typeof date !== "string") ||
    !Number.isFinite(new Date(date).getTime())
  ) {
    throw new Error("Invalid billing document date");
  }
  const validUntil = payload.validUntil;
  if (
    validUntil !== undefined &&
    validUntil !== null &&
    ((typeof validUntil !== "number" && typeof validUntil !== "string") ||
      !Number.isFinite(new Date(validUntil).getTime()))
  ) {
    throw new Error("Invalid billing document validity date");
  }
  return {
    storeInformation,
    client: {
      firstname: text(client.firstname),
      lastname: text(client.lastname),
      email: text(client.email),
      phonenumber: text(client.phonenumber),
      address: nullableText(client.address),
      addressComplement: nullableText(client.addressComplement),
      isProfessional: client.isProfessional,
      companyName: nullableText(client.companyName),
      siret: nullableText(client.siret),
      vatNumber: nullableText(client.vatNumber),
    },
    billingDocument: {
      operationType,
      number: text(payload.documentNumber),
      date,
      validUntil,
      settledDate: snapshot.paidAt,
      lines,
      subtotal: (subtotalCents / 100).toFixed(2),
      taxTotal: ((totalCents - subtotalCents) / 100).toFixed(2),
      total: (totalCents / 100).toFixed(2),
      status: snapshot.status,
      paymentMethod: snapshot.paymentMethod,
      legalNotices: nullableText(payload.comment) ?? undefined,
    },
  };
}
