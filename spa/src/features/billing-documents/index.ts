// Shared with the API (da), which imports these files directly: keep every
// import relative and inside this folder or a type-only import.
export { previewClients, previewData, previewDocuments } from "./fixtures";
export {
  documentTemplates,
  renderDocumentTemplate,
  renderDocumentTemplateFromData,
} from "./render";
export type {
  DocumentTemplateAudience,
  DocumentTemplateBillingDocument,
  DocumentTemplateClient,
  DocumentTemplateData,
  DocumentTemplateLine,
  DocumentTemplatePreviewData,
  DocumentTemplateType,
} from "./types";
