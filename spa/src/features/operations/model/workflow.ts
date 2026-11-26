import type { BillingOperationDTO } from "../types";

export type OperationSuccessMessage =
  | "quoteAccepted"
  | "quoteRejected"
  | "operationCompleted"
  | "invoiceCreated"
  | "operationPaid";

export interface OperationTransition {
  label: "acceptQuote" | "rejectQuote" | "completeOperation" | "createInvoice";
  transition: "accept" | "reject" | "complete";
  success: OperationSuccessMessage;
}

type WorkflowOperation = Pick<
  BillingOperationDTO,
  "status" | "lines" | "snapshots"
>;

function invoiceOf(operation: Pick<BillingOperationDTO, "snapshots">) {
  return operation.snapshots.find(({ kind }) => kind === "invoice");
}

/** Status changes offered for an operation, in display order. */
export function availableTransitions(
  operation: WorkflowOperation,
): OperationTransition[] {
  switch (operation.status) {
    case "pending":
      return [
        {
          label: "acceptQuote",
          transition: "accept",
          success: "quoteAccepted",
        },
        {
          label: "rejectQuote",
          transition: "reject",
          success: "quoteRejected",
        },
      ];
    case "in_progress":
      return [
        {
          label: "completeOperation",
          transition: "complete",
          success: "operationCompleted",
        },
      ];
    case "completed":
      // Legacy operations completed before invoices were created automatically.
      return invoiceOf(operation)
        ? []
        : [
            {
              label: "createInvoice",
              transition: "complete",
              success: "invoiceCreated",
            },
          ];
    default:
      return [];
  }
}

export function awaitsPayment(operation: WorkflowOperation): boolean {
  return (
    operation.status === "completed" || operation.status === "payment_pending"
  );
}

export function hasZeroTotal(operation: WorkflowOperation): boolean {
  return (
    operation.lines.reduce(
      (sum, line) => sum + Math.round(Number(line.total) * 100),
      0,
    ) === 0
  );
}

/** Closing date: quote rejection or invoice payment, if any. */
export function closedAtOf(operation: WorkflowOperation): number | null {
  const rejectedQuote = operation.snapshots.find(
    ({ kind, status }) => kind === "quote" && status === "rejected",
  );
  if (rejectedQuote) return rejectedQuote.updatedAt;
  const invoice = invoiceOf(operation);
  return invoice?.status === "paid" ? (invoice.paidAt ?? null) : null;
}

/** Toast shown after creating an operation. */
export function creationSuccessMessage(
  type: BillingOperationDTO["type"],
  createQuote: boolean,
  created: Pick<BillingOperationDTO, "status">,
) {
  if (createQuote && created.status === "in_progress")
    return "zeroQuoteAccepted";
  if (createQuote) return "operationCreatedWithQuote";
  return type === "repair" ? "repairStarted" : "operationCreated";
}
