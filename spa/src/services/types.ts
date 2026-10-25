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
  date: string;
  status: string;
}

export interface ClientWithOperationsDTO {
  id: number;
  firstname: string;
  lastname: string;
  email: string;
  phonenumber: string;
  privatenote: string | null;
  operations: ClientOperationDTO[];
}

export interface ClientPageDTO {
  clients: ClientWithOperationsDTO[];
  page: number;
  pageSize: number;
  total: number;
}

export type SupportRequestType = "SR" | "INC" | "BUG";

export interface SupportRequestDTO {
  id: number;
  reference: string;
  type: SupportRequestType;
  title: string;
  description: string;
  status: "created";
  createdBy: string;
  createdAt: string;
  discordNotification: "sent" | "failed";
}
