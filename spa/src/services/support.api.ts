import { request } from "./api-client";
import type {
  CreatedSupportRequestDTO,
  SupportNotificationResultDTO,
  SupportRequestPageDTO,
  SupportRequestStatus,
  SupportRequestType,
} from "./types";

export function createSupportRequest(payload: {
  type: SupportRequestType;
  title: string;
  description: string;
}): Promise<CreatedSupportRequestDTO> {
  return request<CreatedSupportRequestDTO>("/support", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function listSupportRequests(options: {
  page: number;
  limit: number;
  type?: SupportRequestType;
  status?: SupportRequestStatus;
}): Promise<SupportRequestPageDTO> {
  const query = new URLSearchParams({
    page: String(options.page),
    limit: String(options.limit),
  });
  if (options.type) query.set("type", options.type);
  if (options.status) query.set("status", options.status);
  return request<SupportRequestPageDTO>(`/support?${query}`);
}

export function resendSupportNotification(
  requestId: number,
): Promise<SupportNotificationResultDTO> {
  return request<SupportNotificationResultDTO>(
    `/support/${requestId}/notification`,
    { method: "POST" },
  );
}
