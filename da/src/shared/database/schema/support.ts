import { sql } from "drizzle-orm";
import {
  check,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { users } from "./auth";

export const supportDailySequences = sqliteTable("support_daily_sequences", {
  date: text("date").primaryKey(),
  lastNumber: integer("last_number").notNull(),
});

export const supportRequests = sqliteTable(
  "support_requests",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    reference: text("reference").notNull(),
    type: text("type").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    status: text("status").notNull().default("created"),
    createdByLegacy: text("created_by_legacy"),
    createdByUserId: integer("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    uniqueIndex("support_requests_reference_idx").on(table.reference),
    check(
      "support_requests_type_check",
      sql`${table.type} IN ('SR', 'INC', 'BUG')`,
    ),
  ],
);