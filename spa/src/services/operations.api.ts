import { request } from "./api-client";
import type {
  BillingDocumentStatus,
  BillingDocumentType,
  BillingOperationCountsDTO,
  BillingOperationDTO,
  BillingOperationPageDTO,
  BillingPaymentMethod,
} from "./types";

export const OPERATIONS_CHANGED_EVENT = "operations-changed";

export function getOperationCounts(): Promise<BillingOperationCountsDTO> {
  return request<BillingOperationCountsDTO>("/operations/counts");
}

function notifyOperationChanged(operation: BillingOperationDTO) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(OPERATIONS_CHANGED_EVENT));
  }
  return operation;
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
  date: string;
  serviceStartAt?: string;
  serviceEndAt?: string;
  comment?: string;
  lines?: BillingLineInput[];
}

export function getOperations(options: {
  clientId?: number;
  type: BillingDocumentType;
  page?: number;
  limit?: number;
  status?: BillingDocumentStatus;
  statuses?: BillingDocumentStatus[];
  search?: string;
}): Promise<BillingOperationPageDTO> {
  const query = new URLSearchParams({
    type: options.type,
    page: String(options.page ?? 1),
    limit: String(options.limit ?? 50),
  });
  if (options.clientId) query.set("clientId", String(options.clientId));
  if (options.statuses?.length) query.set("status", options.statuses.join(","));
  else if (options.status) query.set("status", options.status);
  if (options.search?.trim()) query.set("search", options.search.trim());
  return request<BillingOperationPageDTO>(`/operations?${query}`);
}

export function getOperation(id: number): Promise<BillingOperationDTO> {
  return request<BillingOperationDTO>(`/operations/${id}`);
}

export function createOperation(
  input: BillingOperationInput,
): Promise<BillingOperationDTO> {
  return request<BillingOperationDTO>("/operations", {
    method: "POST",
    body: JSON.stringify(input),
  }).then(notifyOperationChanged);
}

function transitionOperation(
  id: number,
  transition: "accept" | "reject" | "complete",
): Promise<BillingOperationDTO> {
  return request<BillingOperationDTO>(`/operations/${id}/${transition}`, {
    method: "POST",
  }).then(notifyOperationChanged);
}

export const acceptQuote = (id: number) => transitionOperation(id, "accept");
export const rejectQuote = (id: number) => transitionOperation(id, "reject");
export const completeOperation = (id: number) =>
  transitionOperation(id, "complete");

export function payOperation(
  id: number,
  method: BillingPaymentMethod,
): Promise<BillingOperationDTO> {
  return request<BillingOperationDTO>(`/operations/${id}/pay`, {
    method: "POST",
    body: JSON.stringify({ method }),
  }).then(notifyOperationChanged);
}
