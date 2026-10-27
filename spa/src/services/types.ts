export interface AuthTokens {
  accessToken: string;
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

export type BillingDocumentStatus =
  | "created"
  | "pending"
  | "in_progress"
  | "completed"
  | "paid";

export type BillingDocumentType = "repair" | "purchase" | "sale";

export interface RepairDTO {
  id: number;
  clientId: number;
  clientFirstname: string;
  clientLastname: string;
  clientEmail: string;
  clientPhoneNumber: string;
  description: string;
  date: string;
  status: string;
  comment: string | null;
}

export interface ClientOperationDTO {
  id: number;
  type: BillingDocumentType;
  date: number;
  status: string;
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
