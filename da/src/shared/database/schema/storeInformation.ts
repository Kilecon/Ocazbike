import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const storeInformation = sqliteTable("store_information", {
  id: text("id").primaryKey(),
  encryptedPayload: text("encrypted_payload").notNull(),
  encryptionSalt: text("encryption_salt").notNull(),
  updatedAt: text("updated_at").notNull(),
});
