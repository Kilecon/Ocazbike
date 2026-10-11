import { request } from "./api-client";
import type { BillingDocumentType, ClientPageDTO } from "./types";

export function getClientsPage(options: {
  page: number;
  pageSize: number;
  sort: "name_asc" | "name_desc";
  operation: "all" | BillingDocumentType;
  search?: string;
}): Promise<ClientPageDTO> {
  const query = new URLSearchParams({
    page: String(options.page),
    pageSize: String(options.pageSize),
    sort: options.sort,
    operation: options.operation,
  });
  if (options.search) query.set("search", options.search);
  return request<ClientPageDTO>(`/clients?${query}`);
}
