import { useTranslation } from "react-i18next";
import { formatAmount } from "../model/billingLines";
import type { BillingLineDTO } from "../types";

export function OperationLinesTable({
  lines,
}: Readonly<{ lines: BillingLineDTO[] }>) {
  const { t } = useTranslation();
  return (
    <section className="flex min-h-48 flex-1 flex-col gap-4 rounded-xl bg-[var(--oz-input-surface-disabled)] px-5 py-4 md:min-h-40">
      <h2 className="m-0 shrink-0 border-b border-border pb-4 text-base font-semibold text-foreground">
        {t("billingLines")}
      </h2>
      <section
        className="min-h-0 flex-1 overflow-auto overscroll-contain"
        aria-label={t("billingLines")}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: The scroll region must be keyboard accessible.
        tabIndex={0}
      >
        <table className="w-full min-w-[32rem] border-collapse text-left [&_th]:border-b [&_th]:border-border [&_th]:px-3 [&_th]:py-2 [&_th]:text-xs [&_th]:text-muted [&_td]:border-b [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_td]:text-sm [&_td]:text-foreground">
          <thead className="sticky top-0 z-10 bg-[var(--oz-input-surface-disabled)]">
            <tr>
              <th scope="col">{t("description")}</th>
              <th scope="col" className="text-right">
                {t("quantity")}
              </th>
              <th scope="col" className="text-right">
                {t("unitPrice")}
              </th>
              <th scope="col" className="text-right">
                {t("vatRate")}
              </th>
              <th scope="col" className="text-right">
                {t("total")}
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.id}>
                <td>{line.description}</td>
                <td className="text-right tabular-nums">{line.quantity}</td>
                <td className="text-right tabular-nums">
                  {formatAmount(line.unitPrice)}
                </td>
                <td className="text-right tabular-nums">{line.vatRate}%</td>
                <td className="text-right tabular-nums">
                  {formatAmount(line.total)}
                </td>
              </tr>
            ))}
            {lines.length === 0 && (
              <tr>
                <td colSpan={5}>{t("noBillingLines")}</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </section>
  );
}
