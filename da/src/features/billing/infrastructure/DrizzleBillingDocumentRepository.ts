import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
import type { DataProtector } from "../../../shared/crypto/DataProtector";
import type { AppDatabase } from "../../../shared/database/db";
import {
  billingDocumentSnapshots,
  billingDocuments,
  billingInvoices,
  billingLines,
  billingQuotes,
  clients,
} from "../../../shared/database/schema/billing";
import { iso8601ToUtcTimestamp } from "../../../shared/date/iso8601";
import {
  decryptClient,
  decryptClientIdentity,
} from "../../clients/crypto/clientCrypto";
import type {
  BillingDocumentLineInput,
  BillingDocumentSnapshot,
  BillingDocumentStatus,
  BillingDocumentType,
  BillingOperationListItem,
  BillingOperationRecord,
  BillingPaymentMethod,
  ClientSearch,
  CreateBillingOperationInput,
  IBillingDocumentRepository,
} from "../IBillingDocumentRepository";
import {
  BILLING_COUNT_STATUSES,
  BILLING_DOCUMENT_TYPES,
  BillingOperationInputError,
  BillingWorkflowConflictError,
  emptyOperationCounts,
  toOperationListItem,
} from "../IBillingDocumentRepository";

type BillingTransaction = Parameters<
  Parameters<AppDatabase["transaction"]>[0]
>[0];

type SnapshotPayload = Record<string, unknown> & {
  documentNumber: string;
  documentKind: "quote" | "invoice";
};

type EncryptedBillingRow = {
  encryptedPayload: string;
  encryptionSalt: string;
};

function quoteForOperation(transaction: BillingTransaction, id: number) {
  const quote = transaction
    .select()
    .from(billingQuotes)
    .where(eq(billingQuotes.billingDocumentId, id))
    .get();
  if (quote) return { ...quote, legacy: false };
  const legacy = transaction
    .select()
    .from(billingDocumentSnapshots)
    .where(
      and(
        eq(billingDocumentSnapshots.billingDocumentId, id),
        eq(billingDocumentSnapshots.kind, "quote"),
      ),
    )
    .get();
  return legacy
    ? {
        ...legacy,
        legacy: true,
        issuedAtMs: legacy.createdAtMs,
        statusChangedAtMs: legacy.updatedAtMs,
      }
    : undefined;
}

function invoiceForOperation(transaction: BillingTransaction, id: number) {
  const invoice = transaction
    .select()
    .from(billingInvoices)
    .where(eq(billingInvoices.billingDocumentId, id))
    .get();
  if (invoice) return { ...invoice, legacy: false };
  const legacy = transaction
    .select()
    .from(billingDocumentSnapshots)
    .where(
      and(
        eq(billingDocumentSnapshots.billingDocumentId, id),
        eq(billingDocumentSnapshots.kind, "invoice"),
      ),
    )
    .get();
  return legacy
    ? {
        ...legacy,
        legacy: true,
        issuedAtMs: legacy.createdAtMs,
      }
    : undefined;
}

function toOptionalTimestamp(value: string | undefined): number | null {
  return value === undefined ? null : iso8601ToUtcTimestamp(value);
}

function amountInCents(value: string): bigint {
  if (!/^-?\d+(\.\d{1,2})?$/u.test(value)) {
    throw new BillingOperationInputError("Invalid billing amount");
  }
  const negative = value.startsWith("-");
  const [whole, fraction = ""] = value.replace(/^-/, "").split(".");
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  return negative ? -cents : cents;
}

function validateLines(lines: readonly BillingDocumentLineInput[] = []) {
  let total = 0n;
  for (const line of lines) {
    const price = amountInCents(line.unitPrice);
    const amount = amountInCents(line.total);
    if (
      Number(line.quantity) <= 0 ||
      (price < 0n !== amount < 0n && amount !== 0n)
    ) {
      throw new BillingOperationInputError("Invalid billing or discount line");
    }
    total += amount;
  }
  if (total < 0n) {
    throw new BillingOperationInputError(
      "Discounts cannot exceed the billing total",
    );
  }
}

function snapshotTotal(payload: SnapshotPayload): bigint {
  if (!Array.isArray(payload.lines)) {
    throw new Error("Invoice snapshot has invalid lines");
  }
  return payload.lines.reduce((sum: bigint, line: unknown) => {
    if (
      !line ||
      typeof line !== "object" ||
      !("total" in line) ||
      typeof line.total !== "string"
    ) {
      throw new Error("Invoice snapshot has an invalid line total");
    }
    return sum + amountInCents(line.total);
  }, 0n);
}

function validateServicePeriod(input: {
  type: BillingDocumentType;
  serviceStartAt?: string;
  serviceEndAt?: string;
}) {
  if (
    input.type === "rental" &&
    (!input.serviceStartAt || !input.serviceEndAt)
  ) {
    throw new BillingOperationInputError(
      "Rental operations require start and end dates",
    );
  }
  if (Boolean(input.serviceStartAt) !== Boolean(input.serviceEndAt)) {
    throw new BillingOperationInputError(
      "Service start and end dates must be provided together",
    );
  }
  if (
    input.serviceStartAt &&
    input.serviceEndAt &&
    iso8601ToUtcTimestamp(input.serviceStartAt) >
      iso8601ToUtcTimestamp(input.serviceEndAt)
  ) {
    throw new BillingOperationInputError(
      "Service end date must not precede its start date",
    );
  }
}

export class DrizzleBillingDocumentRepository
  implements IBillingDocumentRepository
{
  constructor(
    private readonly database: AppDatabase,
    private readonly protector: DataProtector,
    private readonly clientSearch: ClientSearch,
  ) {}

  async createOperation(
    input: CreateBillingOperationInput,
  ): Promise<BillingOperationRecord | null> {
    const { clientId, createQuote = false } = input;
    validateServicePeriod(input);
    validateLines(input.lines);
    if (createQuote && !input.lines?.length) {
      throw new BillingOperationInputError(
        "Creating a quote requires at least one billing line",
      );
    }
    const id = this.database.transaction((transaction) => {
      const client = transaction
        .select({ id: clients.id })
        .from(clients)
        .where(eq(clients.id, clientId))
        .limit(1)
        .all();

      if (client.length === 0) return null;

      const dateMs = iso8601ToUtcTimestamp(input.date);
      const [document] = transaction
        .insert(billingDocuments)
        .values({
          clientId,
          type: input.type,
          dateMs, // PRIMARY: UTC milliseconds (Unix epoch * 1000)
          serviceStartAtMs: toOptionalTimestamp(input.serviceStartAt),
          serviceEndAtMs: toOptionalTimestamp(input.serviceEndAt),
          comment: input.comment,
          status: "in_progress",
        })
        .returning({ id: billingDocuments.id })
        .all();

      const lines = input.lines?.length
        ? transaction
            .insert(billingLines)
            .values(
              input.lines.map((line) => ({
                billingDocumentId: document.id,
                description: line.description,
                quantity: line.quantity,
                unitPrice: line.unitPrice,
                vatRate: line.vatRate,
                discount: line.discount ?? "0",
                total: line.total,
              })),
            )
            .returning({ total: billingLines.total })
            .all()
        : [];

      const zeroQuote =
        createQuote &&
        lines.reduce((sum, line) => sum + amountInCents(line.total), 0n) === 0n;
      if (createQuote) {
        this.saveSnapshot(
          transaction,
          document.id,
          "quote",
          zeroQuote ? "accepted" : "pending",
        );
        transaction
          .update(billingDocuments)
          .set({
            status: zeroQuote ? "in_progress" : "pending",
          })
          .where(eq(billingDocuments.id, document.id))
          .run();
      }

      return document.id;
    });
    return id === null ? null : this.getOperation(id);
  }

  async countOperations() {
    const counts = emptyOperationCounts();
    const rows = await this.database
      .select({
        type: billingDocuments.type,
        status: billingDocuments.status,
        total: count(),
      })
      .from(billingDocuments)
      .where(inArray(billingDocuments.status, [...BILLING_COUNT_STATUSES]))
      .groupBy(billingDocuments.status, billingDocuments.type);
    for (const row of rows) {
      const type = BILLING_DOCUMENT_TYPES.find((value) => value === row.type);
      const status = BILLING_COUNT_STATUSES.find(
        (value) => value === row.status,
      );
      if (!type || !status) throw new Error("Invalid operation count group");
      counts[type][status] = row.total;
    }
    return counts;
  }

  async listOperations(input: {
    clientId?: number;
    type?: BillingDocumentType;
    statuses?: BillingDocumentStatus[];
    search?: string;
    page: number;
    limit: number;
  }) {
    const matchingClients = input.search
      ? await this.clientSearch.findMatchingClients(input.search)
      : null;
    const filters = [
      input.clientId
        ? eq(billingDocuments.clientId, input.clientId)
        : undefined,
      input.type ? eq(billingDocuments.type, input.type) : undefined,
      input.statuses?.length
        ? inArray(billingDocuments.status, input.statuses)
        : undefined,
      matchingClients
        ? inArray(
            billingDocuments.clientId,
            matchingClients.map(({ id }) => id),
          )
        : undefined,
    ].filter((filter) => filter !== undefined);
    const where = filters.length ? and(...filters) : undefined;
    const [totalRow] = await this.database
      .select({ total: count() })
      .from(billingDocuments)
      .where(where);
    const rows = await this.database
      .select({
        operation: {
          id: billingDocuments.id,
          clientId: billingDocuments.clientId,
          type: billingDocuments.type,
          date: billingDocuments.dateMs,
          serviceStartAt: billingDocuments.serviceStartAtMs,
          serviceEndAt: billingDocuments.serviceEndAtMs,
          comment: billingDocuments.comment,
          status: billingDocuments.status,
          paymentMethod: billingDocuments.paymentMethod,
          paidAt: billingDocuments.paidAtMs,
        },
        client: {
          id: clients.id,
          firstname: clients.firstname,
          lastname: clients.lastname,
          email: clients.email,
          encryptionSalt: clients.encryptionSalt,
        },
        quote: {
          status: billingQuotes.status,
          createdAt: billingQuotes.issuedAtMs,
          updatedAt: billingQuotes.statusChangedAtMs,
        },
        invoice: {
          status: billingInvoices.status,
          createdAt: billingInvoices.issuedAtMs,
          paymentMethod: billingInvoices.paymentMethod,
          paidAt: billingInvoices.paidAtMs,
        },
      })
      .from(billingDocuments)
      .innerJoin(clients, eq(billingDocuments.clientId, clients.id))
      .leftJoin(
        billingQuotes,
        eq(billingQuotes.billingDocumentId, billingDocuments.id),
      )
      .leftJoin(
        billingInvoices,
        eq(billingInvoices.billingDocumentId, billingDocuments.id),
      )
      .where(where)
      .orderBy(desc(billingDocuments.dateMs), desc(billingDocuments.id))
      .limit(input.limit)
      .offset((input.page - 1) * input.limit);
    const legacyRows = rows.length
      ? await this.database
          .select({
            billingDocumentId: billingDocumentSnapshots.billingDocumentId,
            kind: billingDocumentSnapshots.kind,
            status: billingDocumentSnapshots.status,
            createdAt: billingDocumentSnapshots.createdAtMs,
            updatedAt: billingDocumentSnapshots.updatedAtMs,
          })
          .from(billingDocumentSnapshots)
          .where(
            inArray(
              billingDocumentSnapshots.billingDocumentId,
              rows.map(({ operation }) => operation.id),
            ),
          )
          .orderBy(asc(billingDocumentSnapshots.id))
      : [];
    const legacyById = new Map<number, typeof legacyRows>();
    for (const snapshot of legacyRows) {
      const snapshots = legacyById.get(snapshot.billingDocumentId) ?? [];
      snapshots.push(snapshot);
      legacyById.set(snapshot.billingDocumentId, snapshots);
    }
    const decryptedClients = new Map<
      number,
      BillingOperationListItem["client"]
    >();
    const operations = rows.map(
      ({ operation, client: encryptedClient, quote, invoice }) => {
        let client = decryptedClients.get(encryptedClient.id);
        if (!client) {
          client = decryptClientIdentity(this.protector, encryptedClient);
          decryptedClients.set(encryptedClient.id, client);
        }
        const snapshots: BillingOperationListItem["snapshots"] = (
          legacyById.get(operation.id) ?? []
        )
          .filter(({ kind }) => (kind === "quote" ? !quote : !invoice))
          .map((snapshot) => {
            if (snapshot.kind !== "quote" && snapshot.kind !== "invoice")
              throw new Error("Invalid billing snapshot kind");
            return {
              kind: snapshot.kind,
              status:
                snapshot.kind === "invoice"
                  ? snapshot.status === "paid"
                    ? "paid"
                    : "unpaid"
                  : snapshot.status,
              createdAt: snapshot.createdAt,
              updatedAt: snapshot.updatedAt,
              ...(snapshot.kind === "invoice"
                ? {
                    paymentMethod:
                      operation.paymentMethod as BillingPaymentMethod | null,
                    paidAt: operation.paidAt,
                  }
                : {}),
            };
          });
        if (quote) snapshots.push({ kind: "quote", ...quote });
        if (invoice)
          snapshots.push({
            kind: "invoice",
            ...invoice,
            updatedAt: invoice.paidAt ?? invoice.createdAt,
          });
        return toOperationListItem({
          ...operation,
          paymentMethod: operation.paymentMethod as BillingPaymentMethod | null,
          client,
          snapshots,
        });
      },
    );
    return {
      operations,
      page: input.page,
      limit: input.limit,
      total: totalRow.total,
    };
  }

  async getOperation(id: number): Promise<BillingOperationRecord | null> {
    const [row] = await this.database
      .select({
        id: billingDocuments.id,
        clientId: billingDocuments.clientId,
        type: billingDocuments.type,
        dateMs: billingDocuments.dateMs,
        serviceStartAtMs: billingDocuments.serviceStartAtMs,
        serviceEndAtMs: billingDocuments.serviceEndAtMs,
        comment: billingDocuments.comment,
        status: billingDocuments.status,
        paymentMethod: billingDocuments.paymentMethod,
        paidAtMs: billingDocuments.paidAtMs,
        clientFirstname: clients.firstname,
        clientLastname: clients.lastname,
        clientEmail: clients.email,
        clientPhoneNumber: clients.phonenumber,
        clientAddress: clients.address,
        clientAddressComplement: clients.addressComplement,
        clientIsProfessional: clients.isProfessional,
        clientSiret: clients.siret,
        clientCompanyName: clients.companyName,
        clientEncryptionSalt: clients.encryptionSalt,
      })
      .from(billingDocuments)
      .innerJoin(clients, eq(billingDocuments.clientId, clients.id))
      .where(eq(billingDocuments.id, id))
      .limit(1);
    if (!row) return null;

    const [lines, legacyRows, quoteRows, invoiceRows] = await Promise.all([
      this.database
        .select()
        .from(billingLines)
        .where(eq(billingLines.billingDocumentId, id))
        .orderBy(asc(billingLines.id)),
      this.database
        .select()
        .from(billingDocumentSnapshots)
        .where(eq(billingDocumentSnapshots.billingDocumentId, id))
        .orderBy(asc(billingDocumentSnapshots.id)),
      this.database
        .select()
        .from(billingQuotes)
        .where(eq(billingQuotes.billingDocumentId, id)),
      this.database
        .select()
        .from(billingInvoices)
        .where(eq(billingInvoices.billingDocumentId, id)),
    ]);
    const client = decryptClient(this.protector, {
      id: row.clientId,
      firstname: row.clientFirstname,
      lastname: row.clientLastname,
      email: row.clientEmail,
      phonenumber: row.clientPhoneNumber,
      address: row.clientAddress,
      addressComplement: row.clientAddressComplement,
      identityCardNumber: null,
      privatenote: null,
      isProfessional: row.clientIsProfessional,
      siret: row.clientSiret,
      companyName: row.clientCompanyName,
      encryptionSalt: row.clientEncryptionSalt,
    });

    return {
      id: row.id,
      clientId: row.clientId,
      type: row.type,
      date: row.dateMs,
      serviceStartAt: row.serviceStartAtMs,
      serviceEndAt: row.serviceEndAtMs,
      comment: row.comment,
      status: row.status,
      paymentMethod: row.paymentMethod as BillingPaymentMethod | null,
      paidAt: row.paidAtMs,
      lines,
      client: {
        id: client.id,
        firstname: client.firstname,
        lastname: client.lastname,
        email: client.email,
        phonenumber: client.phonenumber,
        address: client.address,
        addressComplement: client.addressComplement,
        isProfessional: client.isProfessional,
        companyName: client.companyName,
        siret: client.siret,
      },
      snapshots: [
        ...legacyRows
          .filter((snapshot) =>
            snapshot.kind === "quote"
              ? quoteRows.length === 0
              : invoiceRows.length === 0,
          )
          .map((snapshot) => ({
            ...this.decryptSnapshot(snapshot),
            ...(snapshot.kind === "invoice"
              ? {
                  status: snapshot.status === "paid" ? "paid" : "unpaid",
                  paymentMethod:
                    row.paymentMethod as BillingPaymentMethod | null,
                  paidAt: row.paidAtMs,
                }
              : {}),
          })),
        ...quoteRows.map((quote) => ({
          kind: "quote" as const,
          status: quote.status,
          payload: this.decryptSnapshotPayload(quote),
          createdAt: quote.issuedAtMs,
          updatedAt: quote.statusChangedAtMs,
        })),
        ...invoiceRows.map((invoice) => ({
          kind: "invoice" as const,
          status: invoice.status,
          payload: this.decryptSnapshotPayload(invoice),
          createdAt: invoice.issuedAtMs,
          updatedAt: invoice.paidAtMs ?? invoice.issuedAtMs,
          paymentMethod: invoice.paymentMethod,
          paidAt: invoice.paidAtMs,
        })),
      ],
    };
  }

  async acceptQuote(id: number) {
    return this.transition(id, ["pending"], "in_progress", {
      updateSnapshot: ["quote", "accepted"],
    });
  }

  async rejectQuote(id: number) {
    return this.transition(id, ["pending"], "cancelled", {
      updateSnapshot: ["quote", "rejected"],
    });
  }

  async completeOperation(id: number) {
    return this.transition(id, ["in_progress", "completed"], "completed");
  }

  async payOperation(id: number, method: BillingPaymentMethod) {
    return this.transition(id, ["completed", "payment_pending"], "paid", {
      snapshot: "invoice",
      updateSnapshot: ["invoice", "paid"],
      paymentMethod: method,
      paidAt: Date.now(),
    });
  }

  private async transition(
    id: number,
    allowedStatuses: string[],
    nextStatus: string,
    options: {
      snapshot?: "invoice";
      updateSnapshot?: ["quote" | "invoice", string];
      paymentMethod?: BillingPaymentMethod;
      paidAt?: number;
    } = {},
  ): Promise<BillingOperationRecord | null> {
    const changed = this.database.transaction((transaction) => {
      const [document] = transaction
        .select()
        .from(billingDocuments)
        .where(eq(billingDocuments.id, id))
        .limit(1)
        .all();
      if (!document) return false;
      if (!allowedStatuses.includes(document.status)) {
        throw new BillingWorkflowConflictError(
          `Cannot change operation from ${document.status} to ${nextStatus}`,
        );
      }
      let effectiveStatus = nextStatus;
      let paymentMethod: BillingPaymentMethod | null | undefined =
        options.paymentMethod;
      let paidAt = options.paidAt;

      if (nextStatus === "completed") {
        options = { ...options, snapshot: "invoice" };
        effectiveStatus = "payment_pending";
      }

      if (options.snapshot === "invoice") {
        const quote = quoteForOperation(transaction, id);
        if (quote && quote.status !== "accepted") {
          throw new BillingWorkflowConflictError(
            "An accepted quote is required before invoicing",
          );
        }

        const invoice = invoiceForOperation(transaction, id);
        if (!invoice) {
          this.saveSnapshot(transaction, id, "invoice", "unpaid");
        }
        const invoiceRow = invoiceForOperation(transaction, id);
        if (!invoiceRow) throw new Error(`Invoice ${id} disappeared`);
        const invoiceTotal = snapshotTotal(
          this.decryptSnapshotPayload(invoiceRow),
        );
        if (invoiceTotal < 0n)
          throw new BillingWorkflowConflictError(
            "Invoice total cannot be negative",
          );
        if (invoiceTotal === 0n) {
          effectiveStatus = "paid";
          paymentMethod = "free";
          paidAt = Math.max(Date.now(), invoiceRow.issuedAtMs);
        } else if (paymentMethod === "free") {
          throw new BillingWorkflowConflictError(
            "The free payment method requires a zero invoice total",
          );
        }
      }

      if (options.updateSnapshot) {
        const [kind, status] = options.updateSnapshot;
        if (kind === "quote") {
          if (status !== "accepted" && status !== "rejected") {
            throw new BillingWorkflowConflictError("Invalid quote status");
          }
          const quote = quoteForOperation(transaction, id);
          if (!quote)
            throw new BillingWorkflowConflictError(
              "Required quote does not exist",
            );
          if (quote.status !== "pending")
            throw new BillingWorkflowConflictError(
              "Only pending quotes can change status",
            );
          const statusChangedAtMs = Math.max(
            Date.now(),
            quote.statusChangedAtMs + 1,
          );
          if (quote.legacy) {
            transaction
              .update(billingDocumentSnapshots)
              .set({ status, updatedAtMs: statusChangedAtMs })
              .where(eq(billingDocumentSnapshots.id, quote.id))
              .run();
          } else {
            transaction
              .update(billingQuotes)
              .set({ status, statusChangedAtMs })
              .where(eq(billingQuotes.id, quote.id))
              .run();
          }
        }
      }

      if (effectiveStatus === "paid") {
        const invoice = invoiceForOperation(transaction, id);
        if (!invoice || !paymentMethod)
          throw new BillingWorkflowConflictError(
            "Invoice or payment method is missing",
          );
        paidAt = Math.max(paidAt ?? Date.now(), invoice.issuedAtMs);
        if (invoice.legacy) {
          transaction
            .update(billingDocumentSnapshots)
            .set({ status: "paid", updatedAtMs: paidAt })
            .where(eq(billingDocumentSnapshots.id, invoice.id))
            .run();
        } else {
          transaction
            .update(billingInvoices)
            .set({
              status: "paid",
              paymentMethod,
              paidAtMs: paidAt,
            })
            .where(eq(billingInvoices.id, invoice.id))
            .run();
        }
      }

      transaction
        .update(billingDocuments)
        .set({
          status: effectiveStatus,
          ...(paymentMethod !== undefined ? { paymentMethod } : {}),
          ...(paidAt ? { paidAtMs: paidAt } : {}),
        })
        .where(eq(billingDocuments.id, id))
        .run();
      return true;
    });
    return changed ? this.getOperation(id) : null;
  }

  private saveSnapshot(
    transaction: BillingTransaction,
    id: number,
    kind: "quote" | "invoice",
    status: string,
  ) {
    const createdAt = Date.now();
    let payload: SnapshotPayload;
    const quote =
      kind === "invoice" ? quoteForOperation(transaction, id) : undefined;
    if (kind === "invoice" && quote) {
      if (quote.status !== "accepted") {
        throw new BillingWorkflowConflictError(
          "An accepted quote is required before invoicing",
        );
      }
      const acceptedQuote = this.decryptSnapshotPayload(quote);
      const {
        status: _status,
        paymentStatus: _paymentStatus,
        paymentMethod: _paymentMethod,
        paidAt: _paidAt,
        validUntil: _validUntil,
        ...quoteContent
      } = acceptedQuote;
      payload = {
        ...quoteContent,
        documentNumber: `FAC${new Date(createdAt).getFullYear()}${String(id).padStart(5, "0")}`,
        sourceDocumentNumber: acceptedQuote.documentNumber,
        documentKind: "invoice",
        date: createdAt,
      };
    } else {
      const [row] = transaction
        .select({
          id: billingDocuments.id,
          clientId: billingDocuments.clientId,
          type: billingDocuments.type,
          dateMs: billingDocuments.dateMs,
          serviceStartAtMs: billingDocuments.serviceStartAtMs,
          serviceEndAtMs: billingDocuments.serviceEndAtMs,
          comment: billingDocuments.comment,
          clientFirstname: clients.firstname,
          clientLastname: clients.lastname,
          clientEmail: clients.email,
          clientPhoneNumber: clients.phonenumber,
          clientAddress: clients.address,
          clientAddressComplement: clients.addressComplement,
          clientIsProfessional: clients.isProfessional,
          clientSiret: clients.siret,
          clientCompanyName: clients.companyName,
          clientEncryptionSalt: clients.encryptionSalt,
        })
        .from(billingDocuments)
        .innerJoin(clients, eq(billingDocuments.clientId, clients.id))
        .where(eq(billingDocuments.id, id))
        .limit(1)
        .all();
      if (!row) throw new Error(`Billing document ${id} disappeared`);

      const lines = transaction
        .select({
          description: billingLines.description,
          quantity: billingLines.quantity,
          unitPrice: billingLines.unitPrice,
          vatRate: billingLines.vatRate,
          discount: billingLines.discount,
          total: billingLines.total,
        })
        .from(billingLines)
        .where(eq(billingLines.billingDocumentId, id))
        .orderBy(asc(billingLines.id))
        .all();
      const client = decryptClient(this.protector, {
        id: row.clientId,
        firstname: row.clientFirstname,
        lastname: row.clientLastname,
        email: row.clientEmail,
        phonenumber: row.clientPhoneNumber,
        address: row.clientAddress,
        addressComplement: row.clientAddressComplement,
        identityCardNumber: null,
        privatenote: null,
        isProfessional: row.clientIsProfessional,
        siret: row.clientSiret,
        companyName: row.clientCompanyName,
        encryptionSalt: row.clientEncryptionSalt,
      });
      payload = {
        documentNumber: `${kind === "quote" ? "DEV" : "FAC"}${new Date(createdAt).getFullYear()}${String(id).padStart(5, "0")}`,
        documentKind: kind,
        operationId: id,
        type: row.type,
        date: kind === "invoice" ? createdAt : row.dateMs,
        ...(kind === "quote"
          ? { validUntil: createdAt + 30 * 24 * 60 * 60 * 1000 }
          : {}),
        serviceStartAt: row.serviceStartAtMs,
        serviceEndAt: row.serviceEndAtMs,
        comment: row.comment,
        client: {
          id: client.id,
          firstname: client.firstname,
          lastname: client.lastname,
          email: client.email,
          phonenumber: client.phonenumber,
          address: client.address,
          addressComplement: client.addressComplement,
          isProfessional: client.isProfessional,
          companyName: client.companyName,
          siret: client.siret,
        },
        lines,
      };
    }
    const salt = this.protector.createSalt();
    const encryptedPayload = this.protector
      .createFieldProtector(salt)
      .encrypt(JSON.stringify(payload));
    const content = {
      billingDocumentId: id,
      encryptedPayload,
      encryptionSalt: salt.toString("base64url"),
      issuedAtMs: createdAt,
    };
    if (kind === "quote") {
      if (status !== "accepted" && status !== "pending")
        throw new Error("Invalid initial quote status");
      transaction
        .insert(billingQuotes)
        .values({
          ...content,
          status,
          statusChangedAtMs: createdAt,
        })
        .run();
    } else {
      transaction
        .insert(billingInvoices)
        .values({
          ...content,
          status: "unpaid",
        })
        .run();
    }
  }

  private decryptSnapshot(
    snapshot: typeof billingDocumentSnapshots.$inferSelect,
  ): BillingDocumentSnapshot {
    return {
      kind: snapshot.kind as "quote" | "invoice",
      status: snapshot.status,
      payload: this.decryptSnapshotPayload(snapshot),
      createdAt: snapshot.createdAtMs,
      updatedAt: snapshot.updatedAtMs,
    };
  }

  private decryptSnapshotPayload(
    snapshot: EncryptedBillingRow,
  ): SnapshotPayload {
    const plaintext = this.protector
      .createFieldProtector(Buffer.from(snapshot.encryptionSalt, "base64url"))
      .decrypt(snapshot.encryptedPayload);
    if (plaintext === null) {
      throw new Error("Billing snapshot payload is unexpectedly empty");
    }
    const payload: unknown = JSON.parse(plaintext);
    if (
      !payload ||
      typeof payload !== "object" ||
      !("documentNumber" in payload) ||
      !("documentKind" in payload)
    ) {
      throw new Error("Stored billing snapshot has an invalid shape");
    }
    return payload as SnapshotPayload;
  }
}
