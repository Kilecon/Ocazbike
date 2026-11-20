import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { users } from "./auth";

export const clients = sqliteTable(
  "clients",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    firstname: text("firstname").notNull(),
    lastname: text("lastname").notNull(),
    email: text("email").notNull(),
    phonenumber: text("phonenumber").notNull(),
    address: text("address"),
    addressComplement: text("address_complement"),
    identityCardNumber: text("identity_card_number"),
    privatenote: text("privatenote"),
    isProfessional: integer("is_professional", { mode: "boolean" })
      .notNull()
      .default(false),
    siret: text("siret"),
    companyName: text("company_name"),
    encryptionSalt: text("encryption_salt"),
    modifiedByUserId: integer("modified_by_user_id").references(
      () => users.id,
      {
        onDelete: "set null",
      },
    ),
    lastModificationMs: integer("last_modification_ms")
      .notNull()
      .default(sql`(cast((julianday('now') - 2440587.5)*86400000 as integer))`),
    createdAtMs: integer("created_at_ms")
      .notNull()
      .default(sql`(cast((julianday('now') - 2440587.5)*86400000 as integer))`),
  },
  (table) => [
    uniqueIndex("clients_encryption_salt_unique").on(table.encryptionSalt),
    index("clients_last_modification_ms_idx").on(table.lastModificationMs),
  ],
);

export const clientSearchTrigrams = sqliteTable(
  "client_search_trigrams",
  {
    clientId: integer("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),

    trigram: text("trigram").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.clientId, table.trigram] }),
    index("client_search_trigrams_trigram_idx").on(table.trigram),
  ],
);

export const billingDocuments = sqliteTable(
  "billing_documents",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    clientId: integer("client_id")
      .notNull()
      .references(() => clients.id),
    type: text("type").notNull(),
    // Read-only ISO projection; dateMs is the persisted source of truth.
    date: text("date").generatedAlwaysAs(
      sql`strftime('%Y-%m-%dT%H:%M:%SZ', date_ms / 1000, 'unixepoch')`,
      { mode: "virtual" },
    ),
    dateMs: integer("date_ms").notNull(), // UTC millisecond timestamp (Unix epoch * 1000). Always use for filtering, sorting.
    serviceStartAtMs: integer("service_start_at_ms"),
    serviceEndAtMs: integer("service_end_at_ms"),
    comment: text("comment"),
    status: text("status").notNull(),
    paymentMethod: text("payment_method"),
    paidAtMs: integer("paid_at_ms"),
  },
  (table) => [
    index("billing_documents_date_ms_idx").on(table.dateMs),
    index("billing_documents_client_type_date_ms_idx").on(
      table.clientId,
      table.type,
      table.dateMs,
      table.id,
    ),
    index("billing_documents_status_type_idx").on(table.status, table.type),
    index("billing_documents_type_date_ms_idx").on(
      table.type,
      table.dateMs,
      table.id,
    ),
    index("billing_documents_status_date_ms_idx").on(
      table.status,
      table.dateMs,
      table.id,
    ),
    index("billing_documents_type_status_date_ms_idx").on(
      table.type,
      table.status,
      table.dateMs,
      table.id,
    ),
  ],
);

export const billingDocumentSnapshots = sqliteTable(
  "billing_document_snapshots",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    billingDocumentId: integer("billing_document_id")
      .notNull()
      .references(() => billingDocuments.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    status: text("status").notNull(),
    encryptedPayload: text("encrypted_payload").notNull(),
    encryptionSalt: text("encryption_salt").notNull(),
    createdAtMs: integer("created_at_ms")
      .notNull()
      .default(sql`(cast((julianday('now') - 2440587.5)*86400000 as integer))`),
    updatedAtMs: integer("updated_at_ms")
      .notNull()
      .default(sql`(cast((julianday('now') - 2440587.5)*86400000 as integer))`),
  },
  (table) => [
    uniqueIndex("billing_document_snapshots_document_kind_unique").on(
      table.billingDocumentId,
      table.kind,
    ),
    index("billing_document_snapshots_status_idx").on(table.status),
  ],
);

export const billingQuotes = sqliteTable(
  "billing_quotes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    billingDocumentId: integer("billing_document_id")
      .notNull()
      .references(() => billingDocuments.id, { onDelete: "cascade" }),
    encryptedPayload: text("encrypted_payload").notNull(),
    encryptionSalt: text("encryption_salt").notNull(),
    status: text("status", {
      enum: ["accepted", "pending", "rejected"],
    }).notNull(),
    issuedAtMs: integer("issued_at_ms").notNull(),
    statusChangedAtMs: integer("status_changed_at_ms").notNull(),
  },
  (table) => [
    uniqueIndex("billing_quotes_document_unique").on(table.billingDocumentId),
    index("billing_quotes_status_issued_idx").on(
      table.status,
      table.issuedAtMs,
    ),
    check(
      "billing_quotes_status_check",
      sql`${table.status} IN ('accepted', 'pending', 'rejected')`,
    ),
    check(
      "billing_quotes_dates_check",
      sql`${table.issuedAtMs} >= 0 AND ${table.statusChangedAtMs} >= ${table.issuedAtMs}`,
    ),
  ],
);

export const billingInvoices = sqliteTable(
  "billing_invoices",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    billingDocumentId: integer("billing_document_id")
      .notNull()
      .references(() => billingDocuments.id, { onDelete: "cascade" }),
    encryptedPayload: text("encrypted_payload").notNull(),
    encryptionSalt: text("encryption_salt").notNull(),
    status: text("status", { enum: ["paid", "unpaid"] }).notNull(),
    paymentMethod: text("payment_method", {
      enum: ["card", "cheque", "bank_transfer", "cash", "free"],
    }),
    paidAtMs: integer("paid_at_ms"),
    issuedAtMs: integer("issued_at_ms").notNull(),
  },
  (table) => [
    uniqueIndex("billing_invoices_document_unique").on(table.billingDocumentId),
    index("billing_invoices_status_issued_idx").on(
      table.status,
      table.issuedAtMs,
    ),
    check(
      "billing_invoices_status_check",
      sql`${table.status} IN ('paid', 'unpaid')`,
    ),
    check(
      "billing_invoices_payment_method_check",
      sql`${table.paymentMethod} IS NULL OR ${table.paymentMethod} IN ('card', 'cheque', 'bank_transfer', 'cash', 'free')`,
    ),
    check(
      "billing_invoices_payment_check",
      sql`(${table.status} = 'unpaid' AND ${table.paymentMethod} IS NULL AND ${table.paidAtMs} IS NULL) OR (${table.status} = 'paid' AND ${table.paymentMethod} IS NOT NULL AND ${table.paidAtMs} IS NOT NULL AND ${table.paidAtMs} >= ${table.issuedAtMs})`,
    ),
    check("billing_invoices_issued_check", sql`${table.issuedAtMs} >= 0`),
  ],
);

export const billingLines = sqliteTable(
  "billing_lines",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    billingDocumentId: integer("billing_document_id")
      .notNull()
      .references(() => billingDocuments.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    quantity: text("quantity").notNull(),
    unitPrice: text("unit_price").notNull(),
    vatRate: text("vat_rate").notNull(),
    discount: text("discount").notNull().default("0"),
    total: text("total").notNull(),
  },
  (table) => [
    index("billing_lines_billing_document_id_idx").on(table.billingDocumentId),
  ],
);
