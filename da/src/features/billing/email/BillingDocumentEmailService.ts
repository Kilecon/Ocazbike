import {
  type Mailer,
  MailNotConfiguredError,
} from "../../../shared/mail/Mailer";
import { logger } from "../../../shared/observability/logger";
import {
  GotenbergPdfRenderer,
  type HtmlToPdfRenderer,
} from "../../../shared/pdf/GotenbergPdfRenderer";
import type { IStoreInformationRepository } from "../../store-information/IStoreInformationRepository";
import {
  EMPTY_STORE_INFORMATION,
  type StoreInformation,
} from "../../store-information/model";
import type {
  BillingDocumentSnapshot,
  BillingOperationRecord,
} from "../IBillingDocumentRepository";
import type { BillingDocumentKind, IBillingEmailLog } from "./IBillingEmailLog";
import {
  billingDocumentNumber,
  formatPdfAmount,
  formatPdfDate,
  renderBillingDocumentPdf,
} from "./renderBillingDocumentPdf";

export type BillingEmailErrorCode =
  | "DOCUMENT_NOT_FOUND"
  | "CLIENT_EMAIL_MISSING"
  | "EMAIL_ALREADY_SENT_TODAY"
  | "EMAIL_NOT_CONFIGURED"
  | "EMAIL_DELIVERY_FAILED";

const ERROR_STATUS: Record<BillingEmailErrorCode, number> = {
  DOCUMENT_NOT_FOUND: 404,
  CLIENT_EMAIL_MISSING: 422,
  EMAIL_ALREADY_SENT_TODAY: 429,
  EMAIL_NOT_CONFIGURED: 503,
  EMAIL_DELIVERY_FAILED: 502,
};

export class BillingEmailError extends Error {
  readonly statusCode: number;

  constructor(
    readonly code: BillingEmailErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "BillingEmailError";
    this.statusCode = ERROR_STATUS[code];
  }
}

export interface BillingEmailResult {
  kind: BillingDocumentKind;
  sentAt: number;
}

/** Calendar day in the shop timezone, used for the one-email-per-day limit. */
export function billingEmailDay(timestampMs: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(timestampMs));
}

function snapshotTotal(snapshot: BillingDocumentSnapshot): number {
  const lines = Array.isArray(snapshot.payload.lines)
    ? snapshot.payload.lines
    : [];
  return (
    lines.reduce(
      (sum: number, line: unknown) =>
        sum +
        Math.round(Number((line as Record<string, unknown>)?.total) * 100),
      0,
    ) / 100
  );
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function composeMessage(
  operation: BillingOperationRecord,
  snapshot: BillingDocumentSnapshot,
  store: StoreInformation,
) {
  const storeName = store.name || "Ocazbike";
  const number = billingDocumentNumber(snapshot);
  const purchase = snapshot.payload.type === "purchase";
  let label = "facture";
  if (snapshot.kind === "quote") {
    label = purchase ? "devis de rachat" : "devis";
  } else if (purchase) {
    label = "facture de rachat";
  }
  const client = operation.client;
  const greetingName = client.isProfessional
    ? (client.companyName ?? `${client.firstname} ${client.lastname}`)
    : `${client.firstname} ${client.lastname}`;
  const amount = formatPdfAmount(snapshotTotal(snapshot));
  let details = `Montant à régler : ${amount}.`;
  if (snapshot.kind === "quote") {
    details = `Montant : ${amount}. Ce devis est valable jusqu’au ${formatPdfDate(snapshot.payload.validUntil)}.`;
  } else if (snapshot.status === "paid") {
    details = `Montant : ${amount}, réglé le ${formatPdfDate(snapshot.paidAt ?? snapshot.payload.date)}.`;
  }
  const phones = [store.phone, store.secondaryPhone]
    .filter(Boolean)
    .join(" / ");
  const signatureLines = [
    "Vente et Réparation de vélos",
    store.address,
    phones ? `Tél ${phones}` : "",
  ].filter(Boolean);
  const paragraphs = [
    `Bonjour ${greetingName.trim()},`,
    `Veuillez trouver ci-joint votre ${label} n° ${number}.`,
    details,
    "Nous restons à votre disposition pour toute question.",
    "Cordialement,",
  ];
  const signatureName = storeName.toUpperCase();
  const signatureDetails = signatureLines.join("\n");
  return {
    subject: `Votre ${label} ${number} - ${storeName}`,
    text: `${paragraphs.join("\n\n")}\n\n${signatureName}\n${signatureDetails}`,
    html: `<div style="font-family:Arial,sans-serif">${paragraphs
      .map(
        (paragraph) =>
          `<p>${escapeHtml(paragraph).replaceAll("\n", "<br>")}</p>`,
      )
      .join(
        "",
      )}</div><div style="font-family:Arial,sans-serif;font-size:13px;line-height:20px;color:#888"><span style="font-size:18px;font-weight:bold;color:#6aa84f">${escapeHtml(signatureName)}</span><br>${escapeHtml(signatureDetails).replace(/\r?\n/g, "<br>")}</div>`,
    filename: `${number || label}.pdf`,
  };
}

export class BillingDocumentEmailService {
  constructor(
    private readonly mailer: Mailer,
    private readonly log: IBillingEmailLog,
    private readonly storeInformation?: IStoreInformationRepository,
    private readonly now: () => number = Date.now,
    private readonly pdfRenderer: HtmlToPdfRenderer = new GotenbergPdfRenderer(),
  ) {}

  async send(
    operation: BillingOperationRecord,
    kind: BillingDocumentKind,
  ): Promise<BillingEmailResult> {
    const snapshot = operation.snapshots.find((item) => item.kind === kind);
    if (!snapshot) {
      throw new BillingEmailError(
        "DOCUMENT_NOT_FOUND",
        `No ${kind} exists for this operation`,
      );
    }
    const recipient = operation.client.email.trim();
    if (!recipient) {
      throw new BillingEmailError(
        "CLIENT_EMAIL_MISSING",
        "The client has no email address",
      );
    }
    const sentAt = this.now();
    const day = billingEmailDay(sentAt);
    if (!(await this.log.reserve(operation.id, kind, day, sentAt))) {
      throw new BillingEmailError(
        "EMAIL_ALREADY_SENT_TODAY",
        `This ${kind} was already emailed today`,
      );
    }
    try {
      const store =
        (await this.storeInformation?.get()) ?? EMPTY_STORE_INFORMATION;
      const message = composeMessage(operation, snapshot, store);
      const pdf = await renderBillingDocumentPdf(
        snapshot,
        store,
        this.pdfRenderer,
      );
      await this.mailer.send({
        to: recipient,
        replyTo: store.email || undefined,
        subject: message.subject,
        text: message.text,
        html: message.html,
        attachments: [
          {
            filename: message.filename,
            content: pdf,
            contentType: "application/pdf",
          },
        ],
      });
    } catch (error) {
      await this.log.release(operation.id, kind, day);
      if (error instanceof MailNotConfiguredError) {
        throw new BillingEmailError(
          "EMAIL_NOT_CONFIGURED",
          "Email sending is not configured",
        );
      }
      const cause =
        error instanceof Error && error.cause instanceof Error
          ? error.cause
          : error;
      // Only log error codes: SMTP messages may contain the client address.
      logger.error({
        message: "Billing email delivery failed",
        operationId: operation.id,
        kind,
        errorCode: (cause as { code?: unknown })?.code,
        responseCode: (cause as { responseCode?: unknown })?.responseCode,
      });
      throw new BillingEmailError(
        "EMAIL_DELIVERY_FAILED",
        "The email could not be delivered",
      );
    }
    return { kind, sentAt };
  }

  /** Adds the last email date (or null) to each snapshot of the operations. */
  async withEmailStatus<
    T extends { id: number; snapshots: { kind: BillingDocumentKind }[] },
  >(
    operations: T[],
  ): Promise<
    (Omit<T, "snapshots"> & {
      snapshots: (T["snapshots"][number] & { emailSentAt: number | null })[];
    })[]
  > {
    const sentAt = await this.log.lastSentAt(operations.map(({ id }) => id));
    return operations.map((operation) => ({
      ...operation,
      snapshots: operation.snapshots.map((snapshot) => ({
        ...snapshot,
        emailSentAt: sentAt.get(operation.id)?.[snapshot.kind] ?? null,
      })),
    }));
  }
}
