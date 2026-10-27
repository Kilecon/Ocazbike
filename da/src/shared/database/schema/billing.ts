import { sql } from "drizzle-orm";
import {
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
    comment: text("comment"),
    status: text("status").notNull(),
  },
  (table) => [
    index("billing_documents_date_ms_idx").on(table.dateMs),
    index("billing_documents_client_id_idx").on(table.clientId),
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
