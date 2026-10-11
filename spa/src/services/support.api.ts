import { request } from "./api-client";
import type { SupportRequestDTO, SupportRequestType } from "./types";

export function createSupportRequest(payload: {
  type: SupportRequestType;
  title: string;
  description: string;
}): Promise<SupportRequestDTO> {
  return request<SupportRequestDTO>("/support", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
