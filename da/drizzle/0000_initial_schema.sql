CREATE TABLE `refresh_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at_ms` integer NOT NULL,
	`revoked_at_ms` integer,
	`user_agent` text,
	`created_at_ms` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`expires_at` text GENERATED ALWAYS AS (CASE WHEN expires_at_ms IS NULL THEN NULL ELSE strftime('%Y-%m-%dT%H:%M:%SZ', expires_at_ms / 1000, 'unixepoch') END) VIRTUAL,
	`revoked_at` text GENERATED ALWAYS AS (CASE WHEN revoked_at_ms IS NULL THEN NULL ELSE strftime('%Y-%m-%dT%H:%M:%SZ', revoked_at_ms / 1000, 'unixepoch') END) VIRTUAL,
	`created_at` text GENERATED ALWAYS AS (CASE WHEN created_at_ms IS NULL THEN NULL ELSE strftime('%Y-%m-%dT%H:%M:%SZ', created_at_ms / 1000, 'unixepoch') END) VIRTUAL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `refresh_sessions_token_hash_unique` ON `refresh_sessions` (`token_hash`);--> statement-breakpoint
CREATE INDEX `refresh_sessions_user_id_idx` ON `refresh_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `refresh_sessions_expires_at_ms_idx` ON `refresh_sessions` (`expires_at_ms`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`email_lookup_hash` text,
	`firstname` text DEFAULT '' NOT NULL,
	`lastname` text DEFAULT '' NOT NULL,
	`encryption_salt` text DEFAULT '' NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'Subadmin' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`must_change_password` integer DEFAULT false NOT NULL,
	`last_login_at_ms` integer,
	`created_at_ms` integer DEFAULT 0 NOT NULL,
	`updated_at_ms` integer DEFAULT 0 NOT NULL,
	`last_login_at` text GENERATED ALWAYS AS (CASE WHEN last_login_at_ms IS NULL THEN NULL ELSE strftime('%Y/%m/%d : %H:%M:%S', last_login_at_ms / 1000, 'unixepoch') END) VIRTUAL,
	`created_at` text GENERATED ALWAYS AS (strftime('%Y/%m/%d : %H:%M:%S', created_at_ms / 1000, 'unixepoch')) VIRTUAL,
	`updated_at` text GENERATED ALWAYS AS (strftime('%Y/%m/%d : %H:%M:%S', updated_at_ms / 1000, 'unixepoch')) VIRTUAL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_encryption_salt_unique` ON `users` (`encryption_salt`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_lookup_hash_unique` ON `users` (`email_lookup_hash`);--> statement-breakpoint
CREATE TABLE `billing_document_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`billing_document_id` integer NOT NULL,
	`kind` text NOT NULL,
	`status` text NOT NULL,
	`encrypted_payload` text NOT NULL,
	`encryption_salt` text NOT NULL,
	`created_at_ms` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at_ms` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`billing_document_id`) REFERENCES `billing_documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `billing_document_snapshots_document_kind_unique` ON `billing_document_snapshots` (`billing_document_id`,`kind`);--> statement-breakpoint
CREATE INDEX `billing_document_snapshots_status_idx` ON `billing_document_snapshots` (`status`);--> statement-breakpoint
CREATE TABLE `billing_documents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_id` integer NOT NULL,
	`type` text NOT NULL,
	`date` text GENERATED ALWAYS AS (strftime('%Y-%m-%dT%H:%M:%SZ', date_ms / 1000, 'unixepoch')) VIRTUAL,
	`date_ms` integer NOT NULL,
	`service_start_at_ms` integer,
	`service_end_at_ms` integer,
	`comment` text,
	`status` text NOT NULL,
	`payment_method` text,
	`paid_at_ms` integer,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `billing_documents_date_ms_idx` ON `billing_documents` (`date_ms`);--> statement-breakpoint
CREATE INDEX `billing_documents_client_type_date_ms_idx` ON `billing_documents` (`client_id`,`type`,`date_ms`,`id`);--> statement-breakpoint
CREATE INDEX `billing_documents_status_type_idx` ON `billing_documents` (`status`,`type`);--> statement-breakpoint
CREATE INDEX `billing_documents_type_date_ms_idx` ON `billing_documents` (`type`,`date_ms`,`id`);--> statement-breakpoint
CREATE INDEX `billing_documents_status_date_ms_idx` ON `billing_documents` (`status`,`date_ms`,`id`);--> statement-breakpoint
CREATE INDEX `billing_documents_type_status_date_ms_idx` ON `billing_documents` (`type`,`status`,`date_ms`,`id`);--> statement-breakpoint
CREATE TABLE `billing_invoices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`billing_document_id` integer NOT NULL,
	`encrypted_payload` text NOT NULL,
	`encryption_salt` text NOT NULL,
	`status` text NOT NULL,
	`payment_method` text,
	`paid_at_ms` integer,
	`issued_at_ms` integer NOT NULL,
	FOREIGN KEY (`billing_document_id`) REFERENCES `billing_documents`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "billing_invoices_status_check" CHECK("billing_invoices"."status" IN ('paid', 'unpaid')),
	CONSTRAINT "billing_invoices_payment_method_check" CHECK("billing_invoices"."payment_method" IS NULL OR "billing_invoices"."payment_method" IN ('card', 'cheque', 'bank_transfer', 'cash', 'free')),
	CONSTRAINT "billing_invoices_payment_check" CHECK(("billing_invoices"."status" = 'unpaid' AND "billing_invoices"."payment_method" IS NULL AND "billing_invoices"."paid_at_ms" IS NULL) OR ("billing_invoices"."status" = 'paid' AND "billing_invoices"."payment_method" IS NOT NULL AND "billing_invoices"."paid_at_ms" IS NOT NULL AND "billing_invoices"."paid_at_ms" >= "billing_invoices"."issued_at_ms")),
	CONSTRAINT "billing_invoices_issued_check" CHECK("billing_invoices"."issued_at_ms" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `billing_invoices_document_unique` ON `billing_invoices` (`billing_document_id`);--> statement-breakpoint
CREATE INDEX `billing_invoices_status_issued_idx` ON `billing_invoices` (`status`,`issued_at_ms`);--> statement-breakpoint
CREATE TABLE `billing_lines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`billing_document_id` integer NOT NULL,
	`description` text NOT NULL,
	`quantity` text NOT NULL,
	`unit_price` text NOT NULL,
	`vat_rate` text NOT NULL,
	`discount` text DEFAULT '0' NOT NULL,
	`total` text NOT NULL,
	FOREIGN KEY (`billing_document_id`) REFERENCES `billing_documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `billing_lines_billing_document_id_idx` ON `billing_lines` (`billing_document_id`);--> statement-breakpoint
CREATE TABLE `billing_quotes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`billing_document_id` integer NOT NULL,
	`encrypted_payload` text NOT NULL,
	`encryption_salt` text NOT NULL,
	`status` text NOT NULL,
	`issued_at_ms` integer NOT NULL,
	`status_changed_at_ms` integer NOT NULL,
	FOREIGN KEY (`billing_document_id`) REFERENCES `billing_documents`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "billing_quotes_status_check" CHECK("billing_quotes"."status" IN ('accepted', 'pending', 'rejected')),
	CONSTRAINT "billing_quotes_dates_check" CHECK("billing_quotes"."issued_at_ms" >= 0 AND "billing_quotes"."status_changed_at_ms" >= "billing_quotes"."issued_at_ms")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `billing_quotes_document_unique` ON `billing_quotes` (`billing_document_id`);--> statement-breakpoint
CREATE INDEX `billing_quotes_status_issued_idx` ON `billing_quotes` (`status`,`issued_at_ms`);--> statement-breakpoint
CREATE TABLE `client_search_trigrams` (
	`client_id` integer NOT NULL,
	`trigram` text NOT NULL,
	PRIMARY KEY(`client_id`, `trigram`),
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `client_search_trigrams_trigram_idx` ON `client_search_trigrams` (`trigram`);--> statement-breakpoint
CREATE TABLE `clients` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`firstname` text NOT NULL,
	`lastname` text NOT NULL,
	`email` text NOT NULL,
	`phonenumber` text NOT NULL,
	`address` text,
	`address_complement` text,
	`identity_card_number` text,
	`privatenote` text,
	`is_professional` integer DEFAULT false NOT NULL,
	`siret` text,
	`company_name` text,
	`encryption_salt` text,
	`modified_by_user_id` integer,
	`last_modification_ms` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`created_at_ms` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`modified_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `clients_encryption_salt_unique` ON `clients` (`encryption_salt`);--> statement-breakpoint
CREATE INDEX `clients_last_modification_ms_idx` ON `clients` (`last_modification_ms`);--> statement-breakpoint
CREATE TABLE `store_information` (
	`id` text PRIMARY KEY NOT NULL,
	`encrypted_payload` text NOT NULL,
	`encryption_salt` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `support_daily_sequences` (
	`date` text PRIMARY KEY NOT NULL,
	`last_number` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `support_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`reference` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`encryption_salt` text,
	`status` text DEFAULT 'created' NOT NULL,
	`created_by_user_id` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`discord_notification_status` text DEFAULT 'pending' NOT NULL,
	`discord_notified_at_ms` integer,
	`discord_notification_attempt_at_ms` integer,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "support_requests_type_check" CHECK("support_requests"."type" IN ('SR', 'INC', 'BUG'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `support_requests_reference_idx` ON `support_requests` (`reference`);--> statement-breakpoint
CREATE INDEX `support_requests_created_at_idx` ON `support_requests` (`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `support_requests_status_created_at_idx` ON `support_requests` (`status`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `support_requests_type_created_at_idx` ON `support_requests` (`type`,`created_at`,`id`);
--> statement-breakpoint
CREATE TRIGGER billing_quotes_content_immutable
BEFORE UPDATE OF id, billing_document_id, encrypted_payload, encryption_salt, issued_at_ms ON billing_quotes
WHEN NEW.id IS NOT OLD.id OR NEW.billing_document_id IS NOT OLD.billing_document_id
  OR NEW.encrypted_payload IS NOT OLD.encrypted_payload OR NEW.encryption_salt IS NOT OLD.encryption_salt
  OR NEW.issued_at_ms IS NOT OLD.issued_at_ms
BEGIN
  SELECT RAISE(ABORT, 'Quote content is immutable');
END;
--> statement-breakpoint
CREATE TRIGGER billing_invoices_content_immutable
BEFORE UPDATE OF id, billing_document_id, encrypted_payload, encryption_salt, issued_at_ms ON billing_invoices
WHEN NEW.id IS NOT OLD.id OR NEW.billing_document_id IS NOT OLD.billing_document_id
  OR NEW.encrypted_payload IS NOT OLD.encrypted_payload OR NEW.encryption_salt IS NOT OLD.encryption_salt
  OR NEW.issued_at_ms IS NOT OLD.issued_at_ms
BEGIN
  SELECT RAISE(ABORT, 'Invoice content is immutable');
END;
--> statement-breakpoint
CREATE TRIGGER billing_legacy_content_immutable
BEFORE UPDATE OF encrypted_payload, encryption_salt, created_at_ms ON billing_document_snapshots
WHEN NEW.encrypted_payload IS NOT OLD.encrypted_payload OR NEW.encryption_salt IS NOT OLD.encryption_salt
  OR NEW.created_at_ms IS NOT OLD.created_at_ms
BEGIN
  SELECT RAISE(ABORT, 'Legacy document content is immutable');
END;