import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAdminToast } from "@/shared/ui/AdminToast";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { useErrorToast } from "@/shared/ui/useErrorToast";
import type { OperationSuccessMessage } from "../model/workflow";
import { useBillingEmailFeedback } from "../OperationEmail";
import { operationQuery, useOperationsChanged } from "../queries";
import type { BillingOperationDTO } from "../types";
import { OperationDetail } from "./OperationDetail";

export function OperationDetailModal({
  operationId,
  title,
  language,
  onClose,
}: Readonly<{
  operationId: number;
  title: string;
  language: string;
  onClose: () => void;
}>) {
  const { t } = useTranslation();
  const { showToast, showErrorToast } = useAdminToast();
  const notifyEmail = useBillingEmailFeedback();
  const operationsChanged = useOperationsChanged();
  const operationResult = useQuery(operationQuery(operationId));
  useErrorToast(operationResult.error, t("operationsLoadError"));
  const operation = operationResult.data ?? null;
  const loading = operationResult.isFetching;
  const [saving, setSaving] = useState(false);

  async function runAction(
    action: () => Promise<BillingOperationDTO>,
    message: OperationSuccessMessage,
  ) {
    setSaving(true);
    try {
      const result = await action();
      showToast("success", t("toastSuccess"), t(message));
      notifyEmail(result.email, result.client.email);
      await operationsChanged(result);
    } catch (error: unknown) {
      showErrorToast(error, t("operationUpdateError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      size="lg"
      scrollable={false}
      aria-label={title}
      onCancel={(event) => {
        if (saving) event.preventDefault();
      }}
      onClose={onClose}
    >
      <OperationDetail
        operation={operation}
        loading={loading}
        saving={saving}
        title={title}
        language={language}
        onBack={() => {
          if (!saving) onClose();
        }}
        onAction={runAction}
        onReload={async () => {
          await operationResult.refetch();
        }}
      />
      {loading || !operation ? (
        <div className="flex justify-end border-t border-border p-5">
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={onClose}
          >
            <X size="1.125rem" aria-hidden="true" />
            {t("closeRepair")}
          </Button>
        </div>
      ) : null}
    </Modal>
  );
}
