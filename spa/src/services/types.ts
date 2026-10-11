export interface SlotDTO {
  id: number;
  scheduleId: number;
  dayOfWeek: number;
  dayName: string;
  startTime: string;
  endTime: string;
}

export interface ScheduleDTO {
  id: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  createdAt: string;
  slots: SlotDTO[];
}

export interface ClosureDTO {
  id: number;
  startDateTime: string;
  endDateTime: string;
  reason: string | null;
  createdAt: string;
  isExpired: boolean;
}

export interface OpeningStatusDTO {
  isOpen: boolean;
  dateTime: string;
  reason: "schedule" | "closure" | "no_schedule";
  nextOpening?: string;
  nextClosing?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: { id: number; email: string; role: "user" | "admin" };
}

export interface PublicUser {
  id: number;
  email: string;
  role: "user" | "admin";
}

export interface ClosuresResponse {
  closures: ClosureDTO[];
  total: number;
  activeCount: number;
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
