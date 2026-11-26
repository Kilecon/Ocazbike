import { Minus, Plus, Trash2 } from "lucide-react";
import type { KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { formatAmount, type OperationLineForm } from "../model/billingLines";
import type { BillingRow } from "./useBillingLines";

// Amounts and VAT are typed, not incremented: hide spinners and block arrow/wheel steps.
const noStepperInputProps = {
  className:
    "text-right tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
    }
  },
  onWheel: (event: { currentTarget: HTMLInputElement }) =>
    event.currentTarget.blur(),
};

export function BillingLinesEditor({
  rows,
  total,
  onUpdate,
  onRemove,
  onAdd,
}: Readonly<{
  rows: BillingRow[];
  total: number;
  onUpdate: <K extends keyof OperationLineForm>(
    index: number,
    key: K,
    value: OperationLineForm[K],
  ) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
}>) {
  const { t } = useTranslation();
  return (
    <section className="flex min-h-0 flex-col gap-4 rounded-xl bg-[var(--oz-input-surface-disabled)] px-5 py-4">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <h3 className="m-0 text-base font-semibold text-foreground">
          {t("billingLines")}
        </h3>
        <p className="m-0 font-semibold text-foreground">
          {t("estimatedTotal")}: {formatAmount(total.toFixed(2))}
        </p>
      </div>
      <section
        className="min-h-0 overflow-auto overscroll-contain"
        aria-label={t("billingLines")}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: The scroll region must be keyboard accessible.
        tabIndex={0} // NOSONAR - intentionally keyboard-focusable scroll region
      >
        <table className="w-full min-w-[68rem] table-fixed border-collapse text-left [&_td]:px-1.5 [&_td]:py-2 [&_td]:align-top [&_td:first-child]:pl-0 [&_td:last-child]:pr-0 [&_th]:px-1.5 [&_th]:pb-2 [&_th]:text-xs [&_th]:font-medium [&_th:first-child]:pl-0 [&_th:last-child]:pr-0">
          <colgroup>
            <col />
            <col className="w-[9.375rem]" span={5} />
            <col className="w-[6.25rem]" />
          </colgroup>
          <thead className="sticky top-0 z-10 bg-[var(--oz-input-surface-disabled)]">
            <tr>
              <th scope="col">{t("description")}*</th>
              <th scope="col" className="text-right">
                {t("quantity")}*
              </th>
              <th scope="col" className="text-right">
                {t("unitPrice")}*
              </th>
              <th scope="col" className="text-right">
                {t("vatRate")}*
              </th>
              <th scope="col" className="text-right">
                {t("lineDiscountAmount")}
              </th>
              <th scope="col" className="text-right">
                {t("lineTotalAmount")}
              </th>
              <th scope="col">
                <span className="sr-only">{t("usersActions")}</span>
              </th>
            </tr>
          </thead>
          {rows.map(({ line, billingLine, discountLine }, index) => (
            <tbody className="border-b border-border" key={line.id}>
              <tr>
                <td>
                  <Input
                    id={`operation-line-description-${line.id}`}
                    aria-label={t("description")}
                    value={line.description}
                    onChange={(event) =>
                      onUpdate(index, "description", event.target.value)
                    }
                    required
                  />
                </td>
                <td>
                  <div className="relative [&_img]:right-15">
                    <Input
                      id={`operation-line-quantity-${line.id}`}
                      aria-label={t("quantity")}
                      className={`${noStepperInputProps.className} pr-16 text-right tabular-nums aria-invalid:pr-22`}
                      type="number"
                      min="1"
                      step="1"
                      value={line.quantity}
                      onChange={(event) =>
                        onUpdate(index, "quantity", event.target.value)
                      }
                      required
                    />
                    <div className="absolute top-1 right-1 grid h-8 w-12 grid-cols-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-6 rounded-sm text-destructive focus-visible:outline-offset-0 disabled:text-muted disabled:opacity-40"
                        aria-label={t("decreaseQuantity")}
                        aria-controls={`operation-line-quantity-${line.id}`}
                        disabled={
                          !Number.isSafeInteger(Number(line.quantity)) ||
                          Number(line.quantity) <= 1
                        }
                        onClick={() =>
                          onUpdate(
                            index,
                            "quantity",
                            String(Number(line.quantity) - 1),
                          )
                        }
                      >
                        <Minus className="size-4" aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-6 rounded-sm text-primary focus-visible:outline-offset-0 disabled:text-muted disabled:opacity-40"
                        aria-label={t("increaseQuantity")}
                        aria-controls={`operation-line-quantity-${line.id}`}
                        disabled={
                          !Number.isSafeInteger(Number(line.quantity)) ||
                          Number(line.quantity) < 1 ||
                          Number(line.quantity) >= Number.MAX_SAFE_INTEGER
                        }
                        onClick={() =>
                          onUpdate(
                            index,
                            "quantity",
                            String(Number(line.quantity) + 1),
                          )
                        }
                      >
                        <Plus className="size-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                </td>
                <td>
                  <Input
                    {...noStepperInputProps}
                    id={`operation-line-price-${line.id}`}
                    aria-label={t("unitPrice")}
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.unitPrice}
                    onChange={(event) =>
                      onUpdate(index, "unitPrice", event.target.value)
                    }
                    required
                  />
                </td>
                <td>
                  <Input
                    {...noStepperInputProps}
                    id={`operation-line-vat-${line.id}`}
                    aria-label={t("vatRate")}
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={line.vatRate}
                    onChange={(event) =>
                      onUpdate(index, "vatRate", event.target.value)
                    }
                    required
                  />
                </td>
                <td>
                  <Input
                    {...noStepperInputProps}
                    id={`operation-line-discount-amount-${line.id}`}
                    aria-label={t("lineDiscountAmount")}
                    type="number"
                    min="0"
                    max={Math.max(
                      0,
                      Number(line.quantity) * Number(line.unitPrice),
                    )}
                    step="0.01"
                    value={line.discount ?? ""}
                    onChange={(event) =>
                      onUpdate(index, "discount", event.target.value)
                    }
                  />
                </td>
                <td>
                  <Input
                    id={`operation-line-total-${line.id}`}
                    aria-label={t("lineTotalAmount")}
                    className="text-right tabular-nums"
                    value={billingLine.total}
                    readOnly
                  />
                </td>
                <td>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      negative
                      size="icon"
                      aria-label={t("removeBillingLine")}
                      onClick={() => onRemove(index)}
                    >
                      <Trash2 className="size-5" aria-hidden="true" />
                    </Button>
                    {index === rows.length - 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label={t("addBillingLine")}
                        onClick={onAdd}
                      >
                        <Plus className="size-5" aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
              {discountLine && (
                <tr
                  aria-label={discountLine.description}
                  data-discount-for={line.id}
                >
                  {(
                    [
                      ["description", t("description")],
                      ["quantity", t("quantity")],
                      ["unitPrice", t("unitPrice")],
                      ["vatRate", t("vatRate")],
                    ] as const
                  ).map(([field, label]) => (
                    <td key={field}>
                      <Input
                        id={`operation-line-discount-${field}-${line.id}`}
                        aria-label={label}
                        className={
                          field === "description"
                            ? undefined
                            : "text-right tabular-nums"
                        }
                        value={discountLine[field]}
                        readOnly
                      />
                    </td>
                  ))}
                  <td />
                  <td>
                    <Input
                      id={`operation-line-discount-total-${line.id}`}
                      aria-label={t("lineTotalAmount")}
                      className="text-right tabular-nums"
                      value={discountLine.total}
                      readOnly
                    />
                  </td>
                  <td />
                </tr>
              )}
            </tbody>
          ))}
        </table>
      </section>
      {total < 0 && (
        <p className="m-0 text-sm text-destructive" role="alert">
          {t("discountExceedsTotal")}
        </p>
      )}
    </section>
  );
}
