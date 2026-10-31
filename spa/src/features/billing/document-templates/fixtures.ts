import type {
  DocumentTemplateAudience,
  DocumentTemplateBillingDocument,
  DocumentTemplateClient,
  DocumentTemplateLine,
  DocumentTemplatePreviewData,
  DocumentTemplateType,
} from "./types";

function previewLine(
  description: string,
  unitPriceExcludingTax: number,
  unitPriceIncludingTax: number,
): DocumentTemplateLine {
  return {
    description,
    quantity: 1,
    unitPriceExcludingTax,
    unitPriceIncludingTax,
    total: unitPriceIncludingTax,
  };
}

export const previewClients = {
  camilleMartin: {
    firstname: "Camille",
    lastname: "Martin",
    email: "camille.martin@example.fr",
    phonenumber: "06 12 34 56 78",
    address: "8 rue des Cyprès\n33000 Bordeaux",
    addressComplement: null,
    isProfessional: false,
    companyName: null,
    siret: null,
    vatNumber: null,
  },
  alexandreDurand: {
    firstname: "Alexandre",
    lastname: "Durand",
    email: "alexandre.durand@example.fr",
    phonenumber: "06 23 45 67 89",
    address: "4 rue du Port\n33000 Bordeaux",
    addressComplement: null,
    isProfessional: false,
    companyName: null,
    siret: null,
    vatNumber: null,
  },
  atelierDuCycle: {
    firstname: "",
    lastname: "",
    email: "comptabilite@atelierducycle.fr",
    phonenumber: "05 56 12 34 56",
    address: "24 cours Victor Hugo\n33000 Bordeaux",
    addressComplement: null,
    isProfessional: true,
    companyName: "Atelier du Cycle",
    siret: "123 456 789 00012",
    vatNumber: "FR 12 123456789",
  },
} as const satisfies Record<string, DocumentTemplateClient>;

export const previewDocuments = {
  invoiceClient: {
    number: "FAC20260042",
    date: "27/10/2026",
    settledDate: "27/10/2026",
    lines: [
      previewLine("Révision complète vélo", 45, 54),
      previewLine("Accessoire vélo", 28, 33.6),
      previewLine("Chambre à air 700c", 12, 14.4),
      previewLine("Réglage des freins", 8, 9.6),
      previewLine("Paire de patins de frein", 10, 12),
      previewLine("Nettoyage transmission", 9, 10.8),
    ],
    subtotal: 112,
    taxTotal: 22.4,
    total: 134.4,
    legalNotices: "",
  },
  invoicePro: {
    number: "FAC20260012",
    date: "27/10/2026",
    settledDate: "27/10/2026",
    lines: [
      previewLine("Révision flotte vélos (forfait)", 120, 144),
      previewLine("Pièces et consommables", 80, 96),
      previewLine("Réglage freins et transmission", 72, 86.4),
      previewLine("Remplacement pneus", 48, 57.6),
      previewLine("Contrôle sécurité", 40, 48),
      previewLine("Main-d’œuvre atelier", 48, 57.6),
    ],
    subtotal: 408,
    taxTotal: 81.6,
    total: 489.6,
  },
  quoteClient: {
    number: "DEV20260018",
    date: "27/10/2026",
    validUntil: "26/11/2026",
    lines: [
      previewLine("Diagnostic transmission", 18, 21.6),
      previewLine("Chaîne vélo 10 vitesses", 14, 16.8),
      previewLine("Réglage dérailleur", 12, 14.4),
      previewLine("Lubrifiant chaîne", 8, 9.6),
      previewLine("Contrôle des freins", 6, 7.2),
      previewLine("Main-d’œuvre atelier", 8, 9.6),
    ],
    subtotal: 66,
    taxTotal: 13.2,
    total: 79.2,
  },
  quotePro: {
    number: "DEV20260007",
    date: "27/10/2026",
    validUntil: "26/11/2026",
    lines: [
      previewLine("Entretien annuel flotte vélos", 120, 144),
      previewLine("Contrôle sécurité et rapport atelier", 90, 108),
      previewLine("Réglage freins et transmission", 75, 90),
      previewLine("Remplacement pièces d’usure", 60, 72),
      previewLine("Déplacement atelier", 45, 54),
      previewLine("Rapport d’intervention", 40, 48),
    ],
    subtotal: 430,
    taxTotal: 86,
    total: 516,
  },
} as const satisfies Record<string, DocumentTemplateBillingDocument>;

export const previewData: Readonly<
  Record<
    DocumentTemplateType,
    Record<DocumentTemplateAudience, DocumentTemplatePreviewData>
  >
> = {
  invoice: {
    client: {
      client: previewClients.camilleMartin,
      billingDocument: previewDocuments.invoiceClient,
    },
    pro: {
      client: previewClients.atelierDuCycle,
      billingDocument: previewDocuments.invoicePro,
    },
  },
  quote: {
    client: {
      client: previewClients.alexandreDurand,
      billingDocument: previewDocuments.quoteClient,
    },
    pro: {
      client: previewClients.atelierDuCycle,
      billingDocument: previewDocuments.quotePro,
    },
  },
};
