import { request } from "./api-client";
import type {
  BillingDocumentType,
  ClientDetailDTO,
  ClientDTO,
  ClientInputDTO,
  ClientOperationDTO,
  ClientPageDTO,
} from "./types";

export function getClientsPage(options: {
  page: number;
  limit: number;
  search?: string;
}): Promise<ClientPageDTO> {
  const query = new URLSearchParams({
    page: String(options.page),
    limit: String(options.limit),
  });
  if (options.search) query.set("search", options.search);
  return request<ClientPageDTO>(`/clients?${query}`);
}

export function getClient(clientId: number): Promise<ClientDetailDTO> {
  return request<ClientDetailDTO>(`/clients/${clientId}`);
}

export function getClientOperations(
  clientId: number,
): Promise<ClientOperationDTO[]> {
  return request<
    { id: number; type: BillingDocumentType; date: number; status: string }[]
  >(`/clients/${clientId}/documents`).then((documents) =>
    documents.map(({ id, type, date, status }) => ({
      id,
      type,
      date,
      status,
    })),
  );
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
