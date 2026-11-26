import { X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/shared/ui/Button";
import type { OperationTransition } from "../model/workflow";
import type { BillingPaymentMethod } from "../types";

const paymentOptions = [
  ["card", "payment_card"],
  ["cheque", "payment_cheque"],
  ["bank_transfer", "payment_bank_transfer"],
  ["cash", "payment_cash"],
] as const satisfies ReadonlyArray<readonly [BillingPaymentMethod, string]>;

export function OperationActions({
  saving,
  payment,
  transitions,
  onClose,
  onPay,
  onTransition,
}: Readonly<{
  saving: boolean;
  /** Invoice still to settle; a zero-total invoice is paid automatically. */
  payment: "none" | "due" | "zero";
  transitions: OperationTransition[];
  onClose: () => void;
  onPay: (method: BillingPaymentMethod) => void;
  onTransition: (transition: OperationTransition) => void;
}>) {
  const { t } = useTranslation();
  const [paymentMethod, setPaymentMethod] =
    useState<BillingPaymentMethod>("card");

  return (
    <footer className="flex shrink-0 flex-wrap items-end justify-end gap-3 border-t border-border p-5 max-[35rem]:[&>button]:w-full">
      <Button
        type="button"
        variant="outline"
        disabled={saving}
        onClick={onClose}
      >
        <X size="1.125rem" aria-hidden="true" />
        {t("closeRepair")}
      </Button>
      {payment === "zero" && (
        <p className="m-0 text-sm text-muted">{t("zeroInvoicePaid")}</p>
      )}
      {payment === "due" && (
        <>
          <label className="grid gap-1 text-sm text-foreground">
            {t("paymentMethod")}
            <select
              className="oz-input min-h-11 px-3 text-foreground"
              value={paymentMethod}
              onChange={(event) => {
                const selected = paymentOptions.find(
                  ([value]) => value === event.target.value,
                )?.[0];
                if (selected) setPaymentMethod(selected);
              }}
            >
              {paymentOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {t(label)}
                </option>
              ))}
            </select>
          </label>
          <Button
            type="button"
            disabled={saving}
            onClick={() => onPay(paymentMethod)}
          >
            {t("markPaid")}
          </Button>
        </>
      )}
      {transitions.map((transition) => (
        <Button
          type="button"
          key={transition.label}
          disabled={saving}
          onClick={() => onTransition(transition)}
        >
          {t(transition.label)}
        </Button>
      ))}
    </footer>
  );
}
