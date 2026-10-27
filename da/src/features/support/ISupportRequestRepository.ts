export type SupportRequestType = "SR" | "INC" | "BUG";
export type SupportRequestStatus = "created" | "pending" | "closed";
export type SupportNotificationStatus =
  | "pending"
  | "sending"
  | "sent"
  | "failed";

export type NotificationClaimResult =
  | { claimed: true; request: SupportRequestRecord }
  | {
      claimed: false;
      reason: "not_found" | "cooldown" | "in_progress" | "closed";
      retryAt?: string;
    };

export interface SupportRequestPage {
  requests: SupportRequestListItem[];
  page: number;
  limit: number;
  total: number;
}

export type SupportRequestListItem = Omit<
  SupportRequestRecord,
  "createdByUserId"
>;

export interface CreateSupportRequestInput {
  type: SupportRequestType;
  title: string;
  description: string;
  createdByUserId: number;
}

export interface SupportRequestRecord
  extends Omit<CreateSupportRequestInput, "createdByUserId"> {
  id: number;
  reference: string;
  status: SupportRequestStatus;
  createdByUserId: number | null;
  createdAt: string;
  discordNotificationStatus: SupportNotificationStatus;
  discordNotifiedAt: string | null;
  discordNotificationAttemptAt: string | null;
}

export interface ISupportRequestRepository {
  create(input: CreateSupportRequestInput): Promise<SupportRequestRecord>;
  claimNotification(id: number, now: Date): Promise<NotificationClaimResult>;
  completeNotification(
    id: number,
    status: "sent" | "failed",
    notifiedAt: Date,
  ): Promise<SupportRequestRecord>;
  listPage(input: {
    page: number;
    limit: number;
    type?: SupportRequestType;
    status?: SupportRequestStatus;
  }): Promise<SupportRequestPage>;
}

export interface SupportNotifier {
  notify(request: SupportRequestRecord): Promise<void>;
}

export function formatSupportReference(
  type: SupportRequestType,
  date: string,
  sequence: number,
): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Support request date must use YYYY-MM-DD format");
  }
  if (!Number.isSafeInteger(sequence) || sequence < 1) {
    throw new Error("Support request sequence must be a positive integer");
  }
  return `${type}-${date}-${String(sequence).padStart(3, "0")}`;
}
