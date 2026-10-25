import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable(
  "users",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    email: text("email").notNull(),
    emailLookupHash: text("email_lookup_hash"),
    firstname: text("firstname").notNull().default(""),
    lastname: text("lastname").notNull().default(""),
    encryptionSalt: text("encryption_salt").notNull().default(""),
    passwordHash: text("password_hash").notNull(),
    role: text("role", { enum: ["Admin", "Subadmin"] })
      .notNull()
      .default("Subadmin"),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    mustChangePassword: integer("must_change_password", { mode: "boolean" })
      .notNull()
      .default(false),
    // PRIMARY INT columns (UTC milliseconds) - ALWAYS use these for queries, filtering, sorting
    lastLoginAtEpochMs: integer("last_login_at_ms"), // nullable: user may never have logged in
    createdAtEpochMs: integer("created_at_ms").notNull().default(0), // UTC milliseconds (Unix epoch * 1000)
    updatedAtEpochMs: integer("updated_at_ms").notNull().default(0), // UTC milliseconds (Unix epoch * 1000)
    // Read-only display projections; the integer columns above are the persisted source of truth.
    lastLoginAt: text("last_login_at").generatedAlwaysAs(
      sql`CASE WHEN last_login_at_ms IS NULL THEN NULL ELSE strftime('%Y/%m/%d : %H:%M:%S', last_login_at_ms / 1000, 'unixepoch') END`,
      { mode: "virtual" },
    ),
    created_at: text("created_at").generatedAlwaysAs(
      sql`strftime('%Y/%m/%d : %H:%M:%S', created_at_ms / 1000, 'unixepoch')`,
      { mode: "virtual" },
    ),
    updated_at: text("updated_at").generatedAlwaysAs(
      sql`strftime('%Y/%m/%d : %H:%M:%S', updated_at_ms / 1000, 'unixepoch')`,
      { mode: "virtual" },
    ),
  },
  (table) => [
    uniqueIndex("users_encryption_salt_unique").on(table.encryptionSalt),
    uniqueIndex("users_email_lookup_hash_unique").on(table.emailLookupHash),
    index("users_created_at_ms_idx").on(table.createdAtEpochMs),
    index("users_updated_at_ms_idx").on(table.updatedAtEpochMs),
    index("users_last_login_at_ms_idx").on(table.lastLoginAtEpochMs),
  ],
);

const virtualUtcDate = (column: string) =>
  sql`CASE WHEN ${sql.raw(column)} IS NULL THEN NULL ELSE strftime('%Y-%m-%dT%H:%M:%SZ', ${sql.raw(column)} / 1000, 'unixepoch') END`;

export const refreshSessions = sqliteTable(
  "refresh_sessions",
  {
    id: text("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: integer("expires_at_ms", { mode: "timestamp_ms" }).notNull(),
    revokedAt: integer("revoked_at_ms", { mode: "timestamp_ms" }),
    userAgent: text("user_agent"),
    createdAt: integer("created_at_ms", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(cast((julianday('now') - 2440587.5)*86400000 as integer))`),
    expiresAtText: text("expires_at").generatedAlwaysAs(
      virtualUtcDate("expires_at_ms"),
      { mode: "virtual" },
    ),
    revokedAtText: text("revoked_at").generatedAlwaysAs(
      virtualUtcDate("revoked_at_ms"),
      { mode: "virtual" },
    ),
    createdAtText: text("created_at").generatedAlwaysAs(
      virtualUtcDate("created_at_ms"),
      { mode: "virtual" },
    ),
  },
  (table) => [
    index("refresh_sessions_user_id_idx").on(table.userId),
    index("refresh_sessions_expires_at_ms_idx").on(table.expiresAt),
  ],
);
