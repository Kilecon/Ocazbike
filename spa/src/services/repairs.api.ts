import { request } from "./api-client";
import type { BillingDocumentStatus, RepairDTO } from "./types";

export function getActiveRepairs(): Promise<RepairDTO[]> {
  return request<RepairDTO[]>("/repairs/");
}

export function createRepair(payload: {
  clientId: number;
  date: string;
  status: BillingDocumentStatus;
  comment: string;
  description: string;
  quantity: string;
  unitPrice: string;
  vatRate: string;
  total: string;
}): Promise<unknown> {
  const {
    clientId,
    description,
    quantity,
    unitPrice,
    vatRate,
    total,
    ...document
  } = payload;
  return request(`/clients/${clientId}/documents`, {
    method: "POST",
    body: JSON.stringify({
      ...document,
      type: "repair",
      lines: [{ description, quantity, unitPrice, vatRate, total }],
    }),
  });
}
