import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { BillingLineInput } from "../api";
import {
  amountForLine,
  discountForLine,
  type OperationLineForm,
} from "../model/billingLines";

export interface BillingRow {
  line: OperationLineForm;
  billingLine: BillingLineInput;
  discountLine: BillingLineInput | undefined;
}

function emptyLine(id: number): OperationLineForm {
  return { id, description: "", quantity: "1", unitPrice: "", vatRate: "20" };
}

/** Editable billing lines with their derived discount lines and total. */
export function useBillingLines() {
  const { t } = useTranslation();
  const [lines, setLines] = useState<OperationLineForm[]>([emptyLine(1)]);
  const nextLineId = useRef(2);

  const rows = useMemo<BillingRow[]>(
    () =>
      lines.map((line) => ({
        line,
        billingLine: {
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          vatRate: line.vatRate,
          discount: "0",
          total: amountForLine(line),
        },
        discountLine: discountForLine(line, t("discountLinePrefix")),
      })),
    [lines, t],
  );
  const formattedLines = useMemo(
    () =>
      rows.flatMap(({ billingLine, discountLine }) =>
        discountLine ? [billingLine, discountLine] : [billingLine],
      ),
    [rows],
  );
  const total = useMemo(
    () =>
      formattedLines.reduce(
        (sum, line) => sum + Math.round(Number(line.total || 0) * 100),
        0,
      ) / 100,
    [formattedLines],
  );

  const updateLine = <K extends keyof OperationLineForm>(
    index: number,
    key: K,
    value: OperationLineForm[K],
  ) =>
    setLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index ? { ...line, [key]: value } : line,
      ),
    );
  // The last line is cleared rather than removed so the table never empties.
  const removeLine = (index: number) =>
    setLines((current) =>
      current.length === 1
        ? [emptyLine(current[0]?.id ?? nextLineId.current++)]
        : current.filter((_, lineIndex) => lineIndex !== index),
    );
  const addLine = () =>
    setLines((current) => [...current, emptyLine(nextLineId.current++)]);

  return { rows, formattedLines, total, updateLine, removeLine, addLine };
}
