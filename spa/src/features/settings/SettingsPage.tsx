import { useQuery } from "@tanstack/react-query";
import { Pencil, Printer } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  type DocumentTemplateAudience,
  type DocumentTemplateType,
  renderDocumentTemplate,
} from "@/features/billing-documents";
import { updateStoreInformation } from "@/features/store-information/api";
import {
  storeInformationQuery,
  useStoreInformationSaved,
} from "@/features/store-information/queries";
import { StoreInformationDialog } from "@/features/store-information/StoreInformationDialog";
import type { StoreInformation } from "@/features/store-information/types";
import { useAdminToast } from "@/shared/ui/AdminToast";
import { Button } from "@/shared/ui/Button";
import { PageHeader, PageShell } from "@/shared/ui/PageShell";
import { StatusTabs } from "@/shared/ui/StatusTabs";
import { useErrorToast } from "@/shared/ui/useErrorToast";

const audiences: readonly DocumentTemplateAudience[] = ["client", "pro"];

function printDocumentHtml(html: string) {
  const printFrame = document.createElement("iframe");
  printFrame.setAttribute("aria-hidden", "true");
  printFrame.tabIndex = -1;
  printFrame.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  printFrame.addEventListener(
    "load",
    () => {
      const printWindow = printFrame.contentWindow;
      if (!printWindow) {
        printFrame.remove();
        return;
      }
      printWindow.addEventListener("afterprint", () => printFrame.remove(), {
        once: true,
      });
      printWindow.focus();
      printWindow.print();
    },
    { once: true },
  );
  // Trusted, script-free template HTML (user data is escaped by the renderer).
  printFrame.srcdoc = html;
  document.body.append(printFrame);
}

function PrintableTemplatePreview({
  previewHtml,
  title,
  printLabel,
}: Readonly<{
  previewHtml: string;
  title: string;
  printLabel: string;
}>) {
  const printPreview = () => printDocumentHtml(previewHtml);

  return (
    <>
      <div className="flex justify-end border-b border-border px-5 py-3">
        <Button
          className="min-h-10 px-3 py-2"
          onClick={printPreview}
          type="button"
          variant="outline"
        >
          <Printer aria-hidden="true" size="1rem" />
          {printLabel}
        </Button>
      </div>
      <iframe
        className="block h-[44rem] w-full border-0 bg-white"
        sandbox=""
        srcDoc={previewHtml}
        title={title}
      />
    </>
  );
}

export function SettingsPage() {
  const { t } = useTranslation();
  const { showToast, showErrorToast } = useAdminToast();
  const [selectedTemplate, setSelectedTemplate] =
    useState<DocumentTemplateType>("invoice");
  const storeInformationResult = useQuery(storeInformationQuery());
  useErrorToast(
    storeInformationResult.error,
    t("settingsStoreInformationLoadError"),
  );
  const storeInformation = storeInformationResult.data ?? null;
  const loadingStoreInformation = storeInformationResult.isPending;
  const storeInformationSaved = useStoreInformationSaved();
  const [savingStoreInformation, setSavingStoreInformation] = useState(false);
  const [storeInformationDialogOpen, setStoreInformationDialogOpen] =
    useState(false);
  const selectedTemplateLabel = t(
    selectedTemplate === "invoice"
      ? "settingsInvoiceTemplate"
      : "settingsQuoteTemplate",
  );
  const previewHtmlByAudience = useMemo<Record<
    DocumentTemplateAudience,
    string
  > | null>(
    () =>
      storeInformation && {
        client: renderDocumentTemplate(
          selectedTemplate,
          "client",
          storeInformation,
        ),
        pro: renderDocumentTemplate(selectedTemplate, "pro", storeInformation),
      },
    [selectedTemplate, storeInformation],
  );

  const saveStoreInformation = async (information: StoreInformation) => {
    setSavingStoreInformation(true);
    try {
      const saved = await updateStoreInformation(information);
      storeInformationSaved(saved);
      setStoreInformationDialogOpen(false);
      showToast(
        "success",
        t("toastSuccess"),
        t("settingsStoreInformationSaved"),
      );
    } catch (error) {
      showErrorToast(error, t("settingsStoreInformationSaveError"));
    } finally {
      setSavingStoreInformation(false);
    }
  };

  return (
    <PageShell labelledBy="settings-title">
      <div>
        <PageHeader
          titleId="settings-title"
          kicker={t("adminSettings")}
          title={t("settingsTemplatesTitle")}
          intro={t("settingsTemplatesIntro")}
          actions={
            <Button
              className="min-h-11 px-4 py-2"
              disabled={loadingStoreInformation || !storeInformation}
              onClick={() => setStoreInformationDialogOpen(true)}
              type="button"
            >
              <Pencil aria-hidden="true" size="1rem" />
              {t("settingsStoreInformationEdit")}
            </Button>
          }
        />

        {loadingStoreInformation && (
          <output className="mt-4 block text-sm text-muted">
            {t("settingsStoreInformationLoading")}
          </output>
        )}

        <StatusTabs
          id="settings-template-tab"
          panelId="settings-template-panel"
          label={t("settingsTemplateTypes")}
          selected={selectedTemplate}
          onSelect={setSelectedTemplate}
          tabs={[
            { value: "invoice", label: t("settingsInvoiceTemplate") },
            { value: "quote", label: t("settingsQuoteTemplate") },
          ]}
        />

        <div
          className="grid items-start gap-5 xl:grid-cols-2"
          role="tabpanel"
          id="settings-template-panel"
          aria-labelledby={`settings-template-tab-${selectedTemplate}`}
        >
          {audiences.map((audience) => {
            const audienceLabel = t(
              audience === "client"
                ? "settingsTemplateClientVersion"
                : "settingsTemplateProVersion",
            );
            const titleId = `settings-template-${selectedTemplate}-${audience}-title`;

            return (
              <section
                aria-labelledby={titleId}
                className="oz-card overflow-hidden"
                key={`${selectedTemplate}-${audience}`}
              >
                <div className="border-b border-border px-5 py-4">
                  <h2
                    className="oz-card-title m-0 text-foreground"
                    id={titleId}
                  >
                    {selectedTemplateLabel} · {audienceLabel}
                  </h2>
                  <p className="mt-1 mb-0 text-sm text-muted">
                    {t("settingsTemplatePreviewDescription")}
                  </p>
                </div>
                {previewHtmlByAudience ? (
                  <PrintableTemplatePreview
                    previewHtml={previewHtmlByAudience[audience]}
                    printLabel={t("settingsTemplatePrint")}
                    title={t("settingsTemplatePreviewTitle", {
                      template: `${selectedTemplateLabel} · ${audienceLabel}`,
                    })}
                  />
                ) : (
                  <output className="block px-5 py-4 text-sm text-muted">
                    {loadingStoreInformation
                      ? t("settingsStoreInformationLoading")
                      : t("settingsStoreInformationUnavailable")}
                  </output>
                )}
              </section>
            );
          })}
        </div>
        {storeInformation && (
          <StoreInformationDialog
            open={storeInformationDialogOpen}
            information={storeInformation}
            saving={savingStoreInformation}
            onClose={() => setStoreInformationDialogOpen(false)}
            onSubmit={(information) => void saveStoreInformation(information)}
          />
        )}
      </div>
    </PageShell>
  );
}
