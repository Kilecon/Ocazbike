import type { BillingDocumentType } from "./types";

/** URL segment of each operation workspace, e.g. `/admin/repairs`. */
export const OPERATION_SECTIONS = {
  repairs: "repair",
  sales: "sale",
  buybacks: "purchase",
  rentals: "rental",
} as const satisfies Record<string, BillingDocumentType>;

export type OperationSection = keyof typeof OPERATION_SECTIONS;

export const SECTION_BY_TYPE: Record<BillingDocumentType, OperationSection> = {
  repair: "repairs",
  sale: "sales",
  purchase: "buybacks",
  rental: "rentals",
};

export function isOperationSection(value: string): value is OperationSection {
  return Object.hasOwn(OPERATION_SECTIONS, value);
}

export const OPERATION_TITLE_KEYS = {
  repair: "adminRepairs",
  purchase: "adminBuybacks",
  sale: "adminSales",
  rental: "adminRentals",
} as const satisfies Record<BillingDocumentType, string>;
