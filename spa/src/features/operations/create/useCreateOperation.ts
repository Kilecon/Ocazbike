import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAdminToast } from "@/shared/ui/AdminToast";
import { createOperation } from "../api";
import { creationSuccessMessage } from "../model/workflow";
import { useBillingEmailFeedback } from "../OperationEmail";
import { useOperationsChanged } from "../queries";
import type { BillingDocumentType } from "../types";
import type { NewOperationInput } from "./CreateOperationForm";

/** Creates an operation and reports the outcome, email included. */
export function useCreateOperation(
  type: BillingDocumentType,
  onCreated: () => void,
) {
  const { t } = useTranslation();
  const { showToast, showErrorToast } = useAdminToast();
  const notifyEmail = useBillingEmailFeedback();
  const operationsChanged = useOperationsChanged();
  const [saving, setSaving] = useState(false);

  const create = async (input: NewOperationInput) => {
    setSaving(true);
    try {
      const created = await createOperation({ ...input, type });
      onCreated();
      showToast(
        "success",
        t("toastSuccess"),
        t(creationSuccessMessage(type, input.createQuote === true, created)),
      );
      notifyEmail(created.email, created.client.email);
      await operationsChanged(created);
    } catch (saveError) {
      showErrorToast(saveError, t("operationCreateError"));
    } finally {
      setSaving(false);
    }
  };

  return { saving, create };
}
