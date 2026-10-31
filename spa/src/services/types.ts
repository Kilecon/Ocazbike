export interface AuthSession {
  expiresIn: number;
  user: PublicUser;
}

export interface PublicUser {
  id: number;
  email: string;
  firstname: string;
  lastname: string;
  role: "Admin" | "Subadmin";
  isActive: boolean;
  mustChangePassword: boolean; // WARN : A voir
}

export interface CurrentUser {
  email: string;
  firstname: string;
  lastname: string;
  role: "Admin" | "Subadmin";
  mustChangePassword: boolean;
  lastLoginAtEpochMs: number | null;
}

export interface ManagedUser {
  id: number;
  email: string;
  firstname: string;
  lastname: string;
  role: "Admin" | "Subadmin";
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAtEpochMs: number | null;
  createdAtEpochMs: number;
  updatedAtEpochMs: number;
}

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
}

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
}

export interface BillingOperationPageDTO {
  operations: BillingOperationListItemDTO[];
  page: number;
  limit: number;
  total: number;
}

export interface BillingOperationListItemDTO
  extends Omit<BillingOperationDTO, "client" | "snapshots" | "lines"> {
  closedAt: number | null;
  client: Pick<
    BillingOperationDTO["client"],
    "firstname" | "lastname" | "email"
  >;
  snapshots: Omit<BillingSnapshotDTO, "payload">[];
}

export interface ClientDetailDTO {
  id: number;
  firstname: string;
  lastname: string;
  email: string;
  phonenumber: string;
  address: string | null;
  addressComplement: string | null;
  identityCardNumber: string | null;
  privatenote: string | null;
  isProfessional: boolean;
  siret: string | null;
  companyName: string | null;
  lastModificationMs: number;
  createdAtMs: number;
}

export type ClientListItemDTO = Omit<
  ClientDetailDTO,
  "privatenote" | "identityCardNumber" | "lastModificationMs" | "createdAtMs"
>;

export interface ClientPageDTO {
  clients: ClientListItemDTO[];
  page: number;
  limit: number;
  total: number;
}

export type ClientDTO = ClientDetailDTO & {
  modifiedByUserId: number | null;
};

export interface ClientFieldsInputDTO {
  firstname: string;
  lastname: string;
  email?: string | null;
  phonenumber?: string | null;
  address?: string;
  addressComplement?: string;
  identityCardNumber?: string | null;
  privatenote?: string;
}

export type ClientInputDTO = ClientFieldsInputDTO &
  (
    | {
        isProfessional?: false;
        siret?: null;
        companyName?: null;
      }
    | {
        isProfessional: true;
        siret?: string | null;
        companyName?: string | null;
      }
  );

export type SupportRequestType = "SR" | "INC" | "BUG";
export type SupportRequestStatus = "created" | "pending" | "closed";
export type SupportNotificationStatus =
  | "pending"
  | "sending"
  | "sent"
  | "failed";

export interface SupportRequestDTO {
  id: number;
  reference: string;
  type: SupportRequestType;
  title: string;
  description: string;
  status: SupportRequestStatus;
  createdAt: string;
  discordNotificationStatus: SupportNotificationStatus;
  discordNotifiedAt: string | null;
  discordNotificationAttemptAt: string | null;
}

export interface CreatedSupportRequestDTO extends SupportRequestDTO {
  discordNotification: "sent" | "failed";
}

export interface SupportNotificationResultDTO extends SupportRequestDTO {
  discordNotification: "sent" | "failed";
}

export interface SupportRequestPageDTO {
  requests: SupportRequestDTO[];
  page: number;
  limit: number;
  total: number;
}
