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
