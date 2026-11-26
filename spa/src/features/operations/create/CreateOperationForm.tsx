import { X } from "lucide-react";
import { type SubmitEvent, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ClientListItemDTO } from "@/features/clients/types";
import { useAdminToast } from "@/shared/ui/AdminToast";
import { Button } from "@/shared/ui/Button";
import { DateInput, DatePicker } from "@/shared/ui/DateInput";
import { Modal } from "@/shared/ui/Modal";
import type { BillingLineInput, BillingOperationInput } from "../api";
import { EmailToggle } from "../EmailToggle";
import { OPERATION_TITLE_KEYS } from "../sections";
import type { BillingDocumentType } from "../types";
import { BillingLinesEditor } from "./BillingLinesEditor";
import { ClientPicker } from "./ClientPicker";
import { useBillingLines } from "./useBillingLines";

const operationSaveLabelKeys = {
  repair: "saveRepair",
  sale: "saveSale",
  purchase: "savePurchase",
  rental: "saveRental",
} as const;

function localDate(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function isoDate(value: string, endOfDay = false): string | undefined {
  if (!value) return undefined;
  return `${value}T${endOfDay ? "23:59:59" : "00:00:00"}Z`;
}

export type NewOperationInput = Omit<
  BillingOperationInput,
  "type" | "comment" | "lines"
> & { comment: string; lines: BillingLineInput[] };

export function CreateOperationForm({
  type,
  saving,
  onCancel,
  onSubmit,
}: Readonly<{
  type: BillingDocumentType;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (input: NewOperationInput) => Promise<void>;
}>) {
  const { t } = useTranslation();
  const { showErrorToast } = useAdminToast();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [step, setStep] = useState<"details" | "billing">("details");
  const [defaultDateField, setDefaultDateField] = useState<"start" | "end">(
    "start",
  );
  const [explicitDateField, setExplicitDateField] = useState<
    "date" | "start" | "end" | null
  >(null);
  const activeDate = explicitDateField ?? defaultDateField;
  const [dateInputKeys, setDateInputKeys] = useState({
    date: 0,
    start: 0,
    end: 0,
  });
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClient, setSelectedClient] =
    useState<ClientListItemDTO | null>(null);
  const [date, setDate] = useState(localDate(new Date()));
  const [serviceStartAt, setServiceStartAt] = useState("");
  const [serviceEndAt, setServiceEndAt] = useState("");
  const [comment, setComment] = useState("");
  const [createQuote, setCreateQuote] = useState(true);
  const [sendQuoteEmail, setSendQuoteEmail] = useState(false);
  const selectedClientEmail = selectedClient?.email?.trim() ?? "";
  const requiresServicePeriod = type === "rental";
  const servicePeriodError =
    serviceStartAt && serviceEndAt && serviceEndAt < serviceStartAt
      ? t("serviceEndBeforeStart")
      : undefined;
  const calendarValue = { date, start: serviceStartAt, end: serviceEndAt }[
    activeDate
  ];
  const calendarLabel = {
    date: t("date"),
    start: t("serviceStartDate"),
    end: t("serviceEndDate"),
  }[activeDate];
  const changeCalendarDate = {
    date: setDate,
    start: setServiceStartAt,
    end: setServiceEndAt,
  }[activeDate];
  const billingLines = useBillingLines();
  const { total, formattedLines } = billingLines;
  const isDetailsStep = step === "details";
  const shouldSendQuoteEmail =
    createQuote && sendQuoteEmail && selectedClientEmail !== "";
  let submitLabel:
    | "saving"
    | "continueToBilling"
    | "saveRepair"
    | "saveSale"
    | "savePurchase"
    | "saveRental" = operationSaveLabelKeys[type];
  if (saving) {
    submitLabel = "saving";
  } else if (isDetailsStep) {
    submitLabel = "continueToBilling";
  }
  const modalSize = isDetailsStep ? "lg" : "xl";
  const formClass = isDetailsStep
    ? "grid grid-cols-1"
    : "flex max-h-[calc(100dvh-2.125rem)] flex-col";
  const stepNumber = isDetailsStep ? 1 : 2;
  const stepLabel = isDetailsStep ? "cancel" : "previousPage";

  const submit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving || !event.currentTarget.reportValidity()) return;
    if (!selectedClient) {
      showErrorToast(
        new Error(t("selectClientRequired")),
        t("selectClientRequired"),
      );
      return;
    }
    if (servicePeriodError) {
      showErrorToast(new Error(servicePeriodError), servicePeriodError);
      return;
    }
    if (step === "details") {
      setStep("billing");
      headingRef.current?.focus();
      dialogRef.current?.scrollTo({ top: 0 });
      return;
    }
    if (total < 0) {
      showErrorToast(
        new Error(t("discountExceedsTotal")),
        t("discountExceedsTotal"),
      );
      return;
    }
    await onSubmit({
      clientId: selectedClient.id,
      createQuote,
      sendQuoteEmail: shouldSendQuoteEmail,
      date: `${date}T12:00:00Z`,
      serviceStartAt: isoDate(serviceStartAt),
      serviceEndAt: isoDate(serviceEndAt, true),
      comment,
      lines: formattedLines,
    });
  };

  return (
    <Modal
      ref={dialogRef}
      size={modalSize}
      scrollable={isDetailsStep}
      aria-labelledby="create-operation-dialog-title"
      onCancel={(event) => {
        if (saving) event.preventDefault();
      }}
      onClose={onCancel}
    >
      <form className={formClass} onSubmit={(event) => void submit(event)}>
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border p-5">
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="oz-card-title m-0 min-w-0 break-words text-foreground"
            id="create-operation-dialog-title"
          >
            {t("newOperation")} {t(OPERATION_TITLE_KEYS[type])}
            <span className="sr-only">
              {" "}
              — {t("operationCreationStep", { step: stepNumber })}
            </span>
          </h2>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={t("modalClose")}
            disabled={saving}
            className="size-8 shrink-0"
            onClick={onCancel}
          >
            <X size="1.125rem" aria-hidden="true" />
          </Button>
        </header>
        {step === "details" ? (
          <fieldset disabled={saving} className="m-0 min-w-0 border-0 p-0">
            <legend className="sr-only">{t("operationDetails")}</legend>
            <div className="grid grid-cols-1 md:grid-cols-[22.5rem_minmax(0,1fr)]">
              <section
                aria-label={t("calendarForDate", { field: calendarLabel })}
                className="flex min-w-0 justify-center border-b border-border md:border-r md:border-b-0"
              >
                <DatePicker
                  value={calendarValue}
                  onChange={(value) => {
                    changeCalendarDate(value);
                    // Replace draft text and validity even when reselecting the same day.
                    setDateInputKeys((keys) => ({
                      ...keys,
                      [activeDate]: keys[activeDate] + 1,
                    }));
                    if (explicitDateField === null) setDefaultDateField("end");
                  }}
                />
              </section>
              <div className="grid content-start gap-5 p-5 [&_label]:grid [&_label]:gap-1 [&_label]:text-xs [&_label]:font-medium">
                <ClientPicker
                  search={clientSearch}
                  selected={selectedClient}
                  onSearchChange={(value) => {
                    setClientSearch(value);
                    setSelectedClient(null);
                  }}
                  onSelect={(client) => {
                    setSelectedClient(client);
                    setClientSearch(`${client.firstname} ${client.lastname}`);
                  }}
                />
                <label htmlFor="operation-date">
                  {t("date")}*
                  <DateInput
                    key={dateInputKeys.date}
                    id="operation-date"
                    value={date}
                    onChange={setDate}
                    required
                    showCalendar={false}
                    onFocus={() => setExplicitDateField("date")}
                  />
                </label>
                <label htmlFor="operation-service-start">
                  {t("serviceStartDate")}
                  {requiresServicePeriod ? "*" : ""}
                  <DateInput
                    key={dateInputKeys.start}
                    id="operation-service-start"
                    value={serviceStartAt}
                    onChange={setServiceStartAt}
                    required={requiresServicePeriod}
                    showCalendar={false}
                    onFocus={() => setExplicitDateField("start")}
                  />
                </label>
                <label htmlFor="operation-service-end">
                  {t("serviceEndDate")}
                  {requiresServicePeriod ? "*" : ""}
                  <DateInput
                    key={dateInputKeys.end}
                    id="operation-service-end"
                    value={serviceEndAt}
                    onChange={setServiceEndAt}
                    required={requiresServicePeriod}
                    error={servicePeriodError}
                    showCalendar={false}
                    onFocus={() => setExplicitDateField("end")}
                  />
                </label>
              </div>
            </div>
          </fieldset>
        ) : (
          <fieldset disabled={saving} className="contents">
            <legend className="sr-only">{t("billingLines")}</legend>
            <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 p-5">
              <BillingLinesEditor
                rows={billingLines.rows}
                total={billingLines.total}
                onUpdate={billingLines.updateLine}
                onRemove={billingLines.removeLine}
                onAdd={billingLines.addLine}
              />
              <div className="grid shrink-0 gap-4">
                <label
                  className="flex items-center gap-4 text-base font-normal text-foreground"
                  htmlFor="operation-create-quote"
                >
                  <input
                    id="operation-create-quote"
                    type="checkbox"
                    role="switch"
                    aria-checked={createQuote}
                    className="oz-quote-switch"
                    checked={createQuote}
                    disabled={saving}
                    onChange={(event) => setCreateQuote(event.target.checked)}
                  />
                  {t("createQuote")}
                </label>
                {createQuote && (
                  <EmailToggle
                    id="operation-send-quote-email"
                    variant="switch"
                    label={t("sendQuoteEmail")}
                    checked={sendQuoteEmail && selectedClientEmail !== ""}
                    disabled={saving}
                    missingEmail={
                      selectedClient !== null && !selectedClientEmail
                    }
                    onChange={setSendQuoteEmail}
                  />
                )}
              </div>
              <label
                className="grid shrink-0 gap-1 text-xs font-medium"
                htmlFor="operation-comment"
              >
                {t("comment")}
                <textarea
                  id="operation-comment"
                  rows={2}
                  className="oz-input max-h-32 min-h-20 w-full resize-y px-3 py-2 font-normal text-foreground disabled:cursor-not-allowed disabled:opacity-70"
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                />
              </label>
            </div>
          </fieldset>
        )}
        <footer className="flex shrink-0 justify-end gap-5 border-t border-border p-5 max-[35rem]:flex-col max-[35rem]:[&>button]:whitespace-normal">
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => {
              if (step === "details") onCancel();
              else {
                setStep("details");
                headingRef.current?.focus();
                dialogRef.current?.scrollTo({ top: 0 });
              }
            }}
          >
            {t(stepLabel)}
          </Button>
          <Button
            type="submit"
            disabled={
              saving ||
              !selectedClient ||
              (step === "details" && Boolean(servicePeriodError)) ||
              (step === "billing" && total < 0)
            }
          >
            {t(submitLabel)}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}
