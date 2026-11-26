/** "completed" only remains on legacy operations awaiting their invoice. */
export type BillingDocumentStatus =
  | "pending"
  | "cancelled"
  | "in_progress"
  | "completed"
  | "payment_pending"
  | "paid";

export type BillingDocumentType = "repair" | "purchase" | "sale" | "rental";

export type BillingOperationCountsDTO = Record<
  BillingDocumentType,
  Record<"pending" | "in_progress" | "payment_pending", number>
>;

export type BillingPaymentMethod =
  | "card"
  | "cheque"
  | "bank_transfer"
  | "cash"
  | "free";

export interface BillingLineDTO {
  id: number;
  billingDocumentId: number;
  description: string;
  quantity: string;
  unitPrice: string;
  vatRate: string;
  discount: string;
  total: string;
}

export interface BillingSnapshotDTO {
  kind: "quote" | "invoice";
  status: string;
  payload: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
  paymentMethod?: BillingPaymentMethod | null;
  paidAt?: number | null;
  /** Last email delivery of this document (UTC ms), or null if never sent. */
  emailSentAt?: number | null;
}

export type BillingDocumentKind = BillingSnapshotDTO["kind"];

export type BillingEmailDeliveryDTO =
  | { status: "sent"; kind: BillingDocumentKind; sentAt: number }
  | {
      status: "failed";
      kind: BillingDocumentKind;
      code: string;
      message: string;
    };

export interface BillingOperationDTO {
  id: number;
  clientId: number;
  type: BillingDocumentType;
  date: number;
  serviceStartAt: number | null;
  serviceEndAt: number | null;
  comment: string | null;
  status: BillingDocumentStatus;
  paymentMethod: BillingPaymentMethod | null;
  paidAt: number | null;
  lines: BillingLineDTO[];
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
  snapshots: BillingSnapshotDTO[];
  /** Present when an email was requested with the create or pay action. */
  email?: BillingEmailDeliveryDTO;
}

export interface BillingOperationPageDTO {
  operations: BillingOperationListItemDTO[];
  page: number;
  limit: number;
  total: number;
}

export interface BillingOperationListItemDTO
  extends Omit<
    BillingOperationDTO,
    "client" | "snapshots" | "lines" | "email"
  > {
  closedAt: number | null;
  client: Pick<
    BillingOperationDTO["client"],
    "firstname" | "lastname" | "email"
  >;
  lines: Pick<BillingLineDTO, "description" | "quantity">[];
  snapshots: Omit<BillingSnapshotDTO, "payload">[];
}
