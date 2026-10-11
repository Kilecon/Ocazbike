import { request } from "./api-client";
import type { ClosureDTO, ClosuresResponse } from "./types";

export function getClosures(): Promise<ClosuresResponse> {
  return request<ClosuresResponse>("/closures/");
}

export function createClosure(payload: {
  startDateTime: string;
  endDateTime: string;
  reason?: string;
}): Promise<ClosureDTO> {
  return request<ClosureDTO>("/closures/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteClosure(id: number): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/closures/${id}`, { method: "DELETE" });
}
