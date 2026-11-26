import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { renderDocumentTemplateFromData } from "@/features/billing-documents/render";
import { documentDataFromSnapshot } from "@/features/billing-documents/snapshot";
import { storeInformationQuery } from "@/features/store-information/queries";
import { useAdminToast } from "@/shared/ui/AdminToast";
import { Button } from "@/shared/ui/Button";
import { useErrorToast } from "@/shared/ui/useErrorToast";
import { operationQuery } from "./queries";

export function OperationDocumentPage({
  operationId,
  kind,
}: Readonly<{
  operationId: number;
  kind: "quote" | "invoice";
}>) {
  const { t } = useTranslation();
  const { showErrorToast } = useAdminToast();
  const operationResult = useQuery(operationQuery(operationId));
  const informationResult = useQuery(storeInformationQuery());
  useErrorToast(
    operationResult.error ?? informationResult.error,
    t("documentLoadError"),
  );
  const loading = operationResult.isPending || informationResult.isPending;
  const information = informationResult.data;
  const snapshot = operationResult.data?.snapshots.find(
    (document) => document.kind === kind,
  );
  const missing = operationResult.isSuccess && !snapshot;
  const html = useMemo(() => {
    if (!snapshot || !information) return null;
    const data = documentDataFromSnapshot(snapshot, information);
    return renderDocumentTemplateFromData(
      kind,
      data.client.isProfessional ? "pro" : "client",
      data,
    );
  }, [snapshot, information, kind]);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [documentReady, setDocumentReady] = useState(false);
  const [documentHeight, setDocumentHeight] = useState<string>();
  const title = t(kind === "quote" ? "openQuote" : "openInvoice");
  let errorMessageKey: "documentLoadError" | "missingQuote" | "missingInvoice" =
    "documentLoadError";
  if (missing) {
    errorMessageKey = kind === "quote" ? "missingQuote" : "missingInvoice";
  }

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

  function renderDocumentContent() {
    if (loading) return <output className="block">{t("loading")}</output>;
    if (!html) return <p role="alert">{t(errorMessageKey)}</p>;
    return (
      <div className="overflow-x-auto pb-4">
        <iframe
          ref={iframeRef}
          className="mx-auto block min-h-[297mm] w-[210mm] border-0 bg-white shadow-lg"
          style={documentHeight ? { height: documentHeight } : undefined}
          sandbox="allow-same-origin allow-modals"
          onLoad={() => {
            const frameDocument = iframeRef.current?.contentDocument;
            if (!frameDocument) {
              showErrorToast(
                new Error("Document frame is unavailable"),
                t("documentLoadError"),
              );
              return;
            }
            const rootFontSize = Number.parseFloat(
              window.getComputedStyle(document.documentElement).fontSize,
            );
            setDocumentHeight(
              `${frameDocument.documentElement.scrollHeight / rootFontSize}rem`,
            );
            setDocumentReady(true);
          }}
          srcDoc={html}
          title={title}
        />
      </div>
    );
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
          <Printer aria-hidden="true" size="1.125rem" />
          {t("printDocument")}
        </Button>
      </header>
      {renderDocumentContent()}
    </main>
  );
}
