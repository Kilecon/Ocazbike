import { request } from "@/shared/api/http";
import type {
  ClientDetailDTO,
  ClientDTO,
  ClientInputDTO,
  ClientPageDTO,
} from "./types";

export interface ClientListParams {
  page: number;
  limit: number;
  search?: string;
}

export function getClientsPage(
  options: ClientListParams,
  signal?: AbortSignal,
): Promise<ClientPageDTO> {
  const query = new URLSearchParams({
    page: String(options.page),
    limit: String(options.limit),
  });
  if (options.search) query.set("search", options.search);
  return request<ClientPageDTO>(`/clients?${query}`, { signal });
}

export function getClient(
  clientId: number,
  signal?: AbortSignal,
): Promise<ClientDetailDTO> {
  return request<ClientDetailDTO>(`/clients/${clientId}`, { signal });
}

export function createClient(input: ClientInputDTO): Promise<ClientDTO> {
  return request<ClientDTO>("/clients", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateClient(
  clientId: number,
  input: ClientInputDTO,
): Promise<ClientDetailDTO> {
  return request<ClientDetailDTO>(`/clients/${clientId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}
