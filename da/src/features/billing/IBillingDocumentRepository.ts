export const BILLING_DOCUMENT_TYPES = [
  "repair",
  "purchase",
  "sale",
  "rental",
] as const;
export type BillingDocumentType = (typeof BILLING_DOCUMENT_TYPES)[number];
export const BILLING_COUNT_STATUSES = [
  "pending",
  "in_progress",
  "payment_pending",
] as const;
export type BillingOperationCounts = Record<
  BillingDocumentType,
  Record<(typeof BILLING_COUNT_STATUSES)[number], number>
>;

export function emptyOperationCounts(): BillingOperationCounts {
  return {
    repair: { pending: 0, in_progress: 0, payment_pending: 0 },
    sale: { pending: 0, in_progress: 0, payment_pending: 0 },
    purchase: { pending: 0, in_progress: 0, payment_pending: 0 },
    rental: { pending: 0, in_progress: 0, payment_pending: 0 },
  };
}
export const BILLING_PAYMENT_METHODS = [
  "card",
  "cheque",
  "bank_transfer",
  "cash",
  "free",
] as const;
export type BillingPaymentMethod = (typeof BILLING_PAYMENT_METHODS)[number];
// "completed" only exists on legacy operations; completing or paying them invoices them.
export const BILLING_DOCUMENT_STATUSES = [
  "pending",
  "in_progress",
  "completed",
  "payment_pending",
  "paid",
  "cancelled",
] as const;
export type BillingDocumentStatus = (typeof BILLING_DOCUMENT_STATUSES)[number];
export class BillingWorkflowConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BillingWorkflowConflictError";
  }
}

export class BillingOperationInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BillingOperationInputError";
  }
}

export interface BillingDocumentLineInput {
  description: string;
  quantity: string;
  unitPrice: string;
  vatRate: string;
  discount?: string;
  total: string;
}

/**
 * Dates are ISO 8601 strings with a mandatory timezone (`Z` or `±HH:mm`),
 * converted to UTC milliseconds by the repository.
 */
export interface CreateBillingOperationInput {
  clientId: number;
  createQuote?: boolean;
  type: BillingDocumentType;
  date: string;
  comment?: string;
  serviceStartAt?: string;
  serviceEndAt?: string;
  lines?: BillingDocumentLineInput[];
}

export interface BillingDocumentLineRecord {
  id: number;
  billingDocumentId: number;
  description: string;
  quantity: string;
  unitPrice: string;
  vatRate: string;
  discount: string;
  total: string;
}

/**
 * Billing document record as stored and returned from database.
 * All timestamps are in UTC milliseconds (Unix epoch).
 */
export interface BillingDocumentRecord {
  id: number;
  clientId: number;
  type: string;
  /** UTC millisecond timestamp. Unix epoch (January 1, 1970) in milliseconds. */
  date: number;
  comment: string | null;
  status: string;
  serviceStartAt: number | null;
  serviceEndAt: number | null;
  paymentMethod: BillingPaymentMethod | null;
  paidAt: number | null;
  lines: BillingDocumentLineRecord[];
}

export interface BillingDocumentSnapshot {
  kind: "quote" | "invoice";
  status: string;
  payload: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
  paymentMethod?: BillingPaymentMethod | null;
  paidAt?: number | null;
}

export interface BillingOperationRecord extends BillingDocumentRecord {
  client: {
    id: number;
    firstname: string;
    lastname: string;
    email: string;
    phonenumber: string;
    address: string | null;
    addressComplement: string | null;
    isProfessional: boolean;
    companyName: string | null;
    siret: string | null;
  };
  snapshots: BillingDocumentSnapshot[];
}

export interface BillingOperationPage {
  operations: BillingOperationListItem[];
  page: number;
  limit: number;
  total: number;
}

export interface BillingOperationListItem
  extends Omit<BillingOperationRecord, "client" | "snapshots" | "lines"> {
  closedAt: number | null;
  client: Pick<
    BillingOperationRecord["client"],
    "firstname" | "lastname" | "email"
  >;
  snapshots: Omit<BillingDocumentSnapshot, "payload">[];
}

export function toOperationListItem(
  operation: Omit<BillingOperationRecord, "lines" | "snapshots" | "client"> & {
    lines?: BillingDocumentLineRecord[];
    client: BillingOperationListItem["client"];
    snapshots: (Omit<BillingDocumentSnapshot, "payload"> & {
      payload?: Record<string, unknown>;
    })[];
  },
): BillingOperationListItem {
  const invoice = operation.snapshots.find(({ kind }) => kind === "invoice");
  const rejectedQuote = operation.snapshots.find(
    ({ kind, status }) => kind === "quote" && status === "rejected",
  );
  const { lines: _lines, ...summary } = operation;
  const closedAt = rejectedQuote
    ? rejectedQuote.updatedAt
    : invoice?.status === "paid"
      ? (invoice.paidAt ?? null)
      : null;
  return {
    ...summary,
    closedAt,
    serviceStartAt: operation.serviceStartAt ?? operation.date,
    serviceEndAt: operation.serviceEndAt ?? closedAt,
    client: {
      firstname: operation.client.firstname,
      lastname: operation.client.lastname,
      email: operation.client.email,
    },
    snapshots: operation.snapshots.map(
      ({ payload: _payload, ...metadata }) => metadata,
    ),
  };
}

/** Resolves encrypted client searches to client ids for billing filters. */
export interface ClientSearch {
  findMatchingClients(search: string): Promise<{ id: number }[]>;
}

export interface IBillingDocumentRepository {
  countOperations(): Promise<BillingOperationCounts>;
  listOperations(input: {
    clientId?: number;
    type?: BillingDocumentType;
    statuses?: BillingDocumentStatus[];
    search?: string;
    page: number;
    limit: number;
  }): Promise<BillingOperationPage>;
  getOperation(id: number): Promise<BillingOperationRecord | null>;
  createOperation(
    input: CreateBillingOperationInput,
  ): Promise<BillingOperationRecord | null>;
  acceptQuote(id: number): Promise<BillingOperationRecord | null>;
  rejectQuote(id: number): Promise<BillingOperationRecord | null>;
  completeOperation(id: number): Promise<BillingOperationRecord | null>;
  payOperation(
    id: number,
    method: BillingPaymentMethod,
  ): Promise<BillingOperationRecord | null>;
}
