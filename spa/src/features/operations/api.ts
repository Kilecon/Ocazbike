import { request } from "@/shared/api/http";
import type {
  BillingDocumentKind,
  BillingDocumentStatus,
  BillingDocumentType,
  BillingOperationCountsDTO,
  BillingOperationDTO,
  BillingOperationPageDTO,
  BillingPaymentMethod,
} from "./types";

export function getOperationCounts(
  signal?: AbortSignal,
): Promise<BillingOperationCountsDTO> {
  return request<BillingOperationCountsDTO>("/operations/counts", { signal });
}

export interface BillingLineInput {
  description: string;
  quantity: string;
  unitPrice: string;
  vatRate: string;
  discount?: string;
  total: string;
}

export interface BillingOperationInput {
  clientId: number;
  type: BillingDocumentType;
  createQuote?: boolean;
  sendQuoteEmail?: boolean;
  date: string;
  serviceStartAt?: string;
  serviceEndAt?: string;
  comment?: string;
  lines?: BillingLineInput[];
}

export interface OperationListParams {
  clientId?: number;
  type: BillingDocumentType;
  page?: number;
  limit?: number;
  status?: BillingDocumentStatus;
  statuses?: BillingDocumentStatus[];
  search?: string;
}

export function getOperations(
  options: OperationListParams & { signal?: AbortSignal },
): Promise<BillingOperationPageDTO> {
  const query = new URLSearchParams({
    type: options.type,
    page: String(options.page ?? 1),
    limit: String(options.limit ?? 50),
  });
  if (options.clientId) query.set("clientId", String(options.clientId));
  if (options.statuses?.length) query.set("status", options.statuses.join(","));
  else if (options.status) query.set("status", options.status);
  if (options.search?.trim()) query.set("search", options.search.trim());
  return request<BillingOperationPageDTO>(`/operations?${query}`, {
    signal: options.signal,
  });
}

export function getOperation(
  id: number,
  signal?: AbortSignal,
): Promise<BillingOperationDTO> {
  return request<BillingOperationDTO>(`/operations/${id}`, { signal });
}

export function createOperation(
  input: BillingOperationInput,
): Promise<BillingOperationDTO> {
  return request<BillingOperationDTO>("/operations", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

function transitionOperation(
  id: number,
  transition: "accept" | "reject" | "complete",
): Promise<BillingOperationDTO> {
  return request<BillingOperationDTO>(`/operations/${id}/${transition}`, {
    method: "POST",
  });
}

export const acceptQuote = (id: number) => transitionOperation(id, "accept");
export const rejectQuote = (id: number) => transitionOperation(id, "reject");
export const completeOperation = (id: number) =>
  transitionOperation(id, "complete");

export function payOperation(
  id: number,
  method: BillingPaymentMethod,
  sendInvoiceEmail = false,
): Promise<BillingOperationDTO> {
  return request<BillingOperationDTO>(`/operations/${id}/pay`, {
    method: "POST",
    body: JSON.stringify(
      sendInvoiceEmail ? { method, sendInvoiceEmail } : { method },
    ),
  });
}

export function sendOperationEmail(
  id: number,
  kind: BillingDocumentKind,
): Promise<{ kind: BillingDocumentKind; sentAt: number }> {
  return request<{ kind: BillingDocumentKind; sentAt: number }>(
    `/operations/${id}/emails`,
    { method: "POST", body: JSON.stringify({ kind }) },
  );
}
