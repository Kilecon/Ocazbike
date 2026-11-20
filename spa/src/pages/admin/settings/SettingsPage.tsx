import { Pencil, Printer } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAdminToast } from "../../../components/admin/AdminToast";
import { Button } from "../../../components/ui/button";
import {
  type DocumentTemplateAudience,
  type DocumentTemplateType,
  renderDocumentTemplate,
} from "../../../features/billing/document-templates";
import { StoreInformationDialog } from "../../../features/store-information/StoreInformationDialog";
import {
  getStoreInformation,
  updateStoreInformation,
} from "../../../features/store-information/storeInformation.api";
import type { StoreInformation } from "../../../features/store-information/types";
import { AdminPageShell } from "../common/AdminPageShell";

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
}: {
  previewHtml: string;
  title: string;
  printLabel: string;
}) {
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
          <Printer aria-hidden="true" size={16} />
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
  const [storeInformation, setStoreInformation] =
    useState<StoreInformation | null>(null);
  const [loadingStoreInformation, setLoadingStoreInformation] = useState(true);
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

  useEffect(() => {
    let active = true;
    getStoreInformation()
      .then((information) => {
        if (active) setStoreInformation(information);
      })
      .catch((error: unknown) => {
        if (active)
          showErrorToast(error, t("settingsStoreInformationLoadError"));
      })
      .finally(() => {
        if (active) setLoadingStoreInformation(false);
      });
    return () => {
      active = false;
    };
  }, [showErrorToast, t]);

  const saveStoreInformation = async (information: StoreInformation) => {
    setSavingStoreInformation(true);
    try {
      const saved = await updateStoreInformation(information);
      setStoreInformation(saved);
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
    <AdminPageShell labelledBy="settings-title">
      <div className="mx-auto max-w-[87.5rem]">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-semibold text-[var(--oz-orange)]">
              {t("adminSettings")}
            </p>
            <h1
              className="m-0 font-[var(--font-display)] text-2xl leading-[1.2] font-bold text-foreground"
              id="settings-title"
            >
              {t("settingsTemplatesTitle")}
            </h1>
            <p className="mt-3 mb-0 max-w-3xl text-sm leading-6 text-muted">
              {t("settingsTemplatesIntro")}
            </p>
          </div>
          <Button
            className="min-h-11 px-4 py-2"
            disabled={loadingStoreInformation || !storeInformation}
            onClick={() => setStoreInformationDialogOpen(true)}
            type="button"
          >
            <Pencil aria-hidden="true" size={16} />
            {t("settingsStoreInformationEdit")}
          </Button>
        </header>

        {loadingStoreInformation && (
          <p className="mt-4 text-sm text-muted" role="status">
            {t("settingsStoreInformationLoading")}
          </p>
        )}

        <div className="mt-6 border-b border-border">
          <fieldset className="-mb-px flex flex-wrap gap-2 border-0 p-0">
            <legend className="sr-only">{t("settingsTemplateTypes")}</legend>
            {(["invoice", "quote"] as const).map((type) => {
              const isSelected = selectedTemplate === type;
              return (
                <button
                  aria-pressed={isSelected}
                  className={`min-h-11 border-b-2 px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--oz-focus)] ${isSelected ? "border-[var(--oz-orange)] text-foreground" : "border-transparent text-muted hover:text-foreground"}`}
                  key={type}
                  onClick={() => setSelectedTemplate(type)}
                  type="button"
                >
                  {type === "invoice"
                    ? t("settingsInvoiceTemplate")
                    : t("settingsQuoteTemplate")}
                </button>
              );
            })}
          </fieldset>
        </div>

        <div className="mt-2 grid items-start gap-5 xl:grid-cols-2">
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
                className="overflow-hidden rounded-lg border border-border bg-surface"
                key={`${selectedTemplate}-${audience}`}
              >
                <div className="border-b border-border px-5 py-4">
                  <h2
                    className="m-0 text-base font-semibold text-foreground"
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
                  <p className="px-5 py-4 text-sm text-muted" role="status">
                    {loadingStoreInformation
                      ? t("settingsStoreInformationLoading")
                      : t("settingsStoreInformationUnavailable")}
                  </p>
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
    </AdminPageShell>
  );
}
