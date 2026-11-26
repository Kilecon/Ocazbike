import { request } from "@/shared/api/http";
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

export interface SupportRequestListParams {
  page: number;
  limit: number;
  type?: SupportRequestType;
  status?: SupportRequestStatus;
}

export function listSupportRequests(
  options: SupportRequestListParams,
  signal?: AbortSignal,
): Promise<SupportRequestPageDTO> {
  const query = new URLSearchParams({
    page: String(options.page),
    limit: String(options.limit),
  });
  if (options.type) query.set("type", options.type);
  if (options.status) query.set("status", options.status);
  return request<SupportRequestPageDTO>(`/support?${query}`, { signal });
}

export function resendSupportNotification(
  requestId: number,
): Promise<SupportNotificationResultDTO> {
  return request<SupportNotificationResultDTO>(
    `/support/${requestId}/notification`,
    { method: "POST" },
  );
}
