import { Printer } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAdminToast } from "../../../components/admin/AdminToast";
import { Button } from "../../../components/ui/button";
import { renderDocumentTemplateFromData } from "../../../features/billing/document-templates/render";
import { documentDataFromSnapshot } from "../../../features/billing/document-templates/snapshot";
import { getStoreInformation } from "../../../features/store-information/storeInformation.api";
import { getOperation } from "../../../services/operations.api";

export function OperationDocumentPage({
  operationId,
  kind,
}: {
  operationId: number;
  kind: "quote" | "invoice";
}) {
  const { t } = useTranslation();
  const { showErrorToast } = useAdminToast();
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [documentReady, setDocumentReady] = useState(false);
  const [documentHeight, setDocumentHeight] = useState(0);
  const title = t(kind === "quote" ? "openQuote" : "openInvoice");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setHtml(null);
    setMissing(false);
    setDocumentReady(false);
    setDocumentHeight(0);
    void Promise.all([getOperation(operationId), getStoreInformation()])
      .then(([operation, information]) => {
        if (!active) return;
        const snapshot = operation.snapshots.find(
          (document) => document.kind === kind,
        );
        if (!snapshot) {
          setMissing(true);
          return;
        }
        const data = documentDataFromSnapshot(snapshot, information);
        setHtml(
          renderDocumentTemplateFromData(
            kind,
            data.client.isProfessional ? "pro" : "client",
            data,
          ),
        );
      })
      .catch((error: unknown) => {
        if (active) showErrorToast(error, t("documentLoadError"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [operationId, kind, showErrorToast, t]);

  function printDocument() {
    try {
      const printWindow = iframeRef.current?.contentWindow;
      if (!printWindow || !documentReady) {
        throw new Error("Document is not ready for printing");
      }
      printWindow.focus();
      printWindow.print();
    } catch (error: unknown) {
      showErrorToast(error, t("documentPrintError"));
    }
  }

  return (
    <main className="min-h-screen bg-surface p-4 text-foreground">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">{title}</h1>
        <Button
          type="button"
          disabled={loading || !html || !documentReady}
          onClick={printDocument}
        >
          <Printer aria-hidden="true" size={18} />
          {t("printDocument")}
        </Button>
      </header>
      {loading ? (
        <p role="status">{t("loading")}</p>
      ) : html ? (
        <div className="overflow-x-auto pb-4">
          <iframe
            ref={iframeRef}
            className="mx-auto block min-h-[297mm] w-[210mm] border-0 bg-white shadow-lg"
            style={documentHeight ? { height: documentHeight } : undefined}
            sandbox="allow-same-origin allow-modals"
            onLoad={() => {
              const document = iframeRef.current?.contentDocument;
              if (!document) {
                showErrorToast(
                  new Error("Document frame is unavailable"),
                  t("documentLoadError"),
                );
                return;
              }
              setDocumentHeight(document.documentElement.scrollHeight);
              setDocumentReady(true);
            }}
            srcDoc={html}
            title={title}
          />
        </div>
      ) : (
        <p role="alert">
          {t(
            missing
              ? kind === "quote"
                ? "missingQuote"
                : "missingInvoice"
              : "documentLoadError",
          )}
        </p>
      )}
    </main>
  );
}
