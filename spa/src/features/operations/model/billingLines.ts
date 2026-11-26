import type { BillingLineInput } from "../api";
import type { BillingOperationListItemDTO } from "../types";

export interface OperationLineForm {
  id: number;
  description: string;
  quantity: string;
  unitPrice: string;
  vatRate: string;
  discount?: string;
}

export function amountForLine(
  line: Pick<OperationLineForm, "quantity" | "unitPrice" | "vatRate">,
): string {
  const quantity = Number(line.quantity);
  const unitPrice = Number(line.unitPrice);
  const vatRate = Number(line.vatRate);
  if (
    !Number.isFinite(quantity) ||
    !Number.isFinite(unitPrice) ||
    !Number.isFinite(vatRate)
  ) {
    return "";
  }
  return (quantity * unitPrice * (1 + vatRate / 100)).toFixed(2);
}

export function discountForLine(
  line: OperationLineForm,
  prefix: string,
): BillingLineInput | undefined {
  const amount = Number(line.discount);
  if (!Number.isFinite(amount) || amount <= 0) return undefined;
  const description = line.description
    .trim()
    .replace(/^\S+/, (word) =>
      word === word.toUpperCase() ? word : word.toLowerCase(),
    );
  const discountLine = {
    description: `${prefix} ${description}`.trimEnd(),
    quantity: "1",
    unitPrice: (-amount).toFixed(2),
    vatRate: line.vatRate,
    discount: "0",
  };
  return { ...discountLine, total: amountForLine(discountLine) };
}

export function formatAmount(value: string): string {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "EUR",
      }).format(amount)
    : value;
}

export function summarizeLines(
  lines: BillingOperationListItemDTO["lines"],
): string {
  return lines
    .map(({ description, quantity }) => {
      const amount = Number(quantity);
      return `${Number.isFinite(amount) ? amount : quantity} ${description}`;
    })
    .join(", ");
}
