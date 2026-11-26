CREATE TABLE `billing_document_emails` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`billing_document_id` integer NOT NULL,
	`kind` text NOT NULL,
	`sent_on_day` text NOT NULL,
	`sent_at_ms` integer NOT NULL,
	FOREIGN KEY (`billing_document_id`) REFERENCES `billing_documents`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "billing_document_emails_kind_check" CHECK("billing_document_emails"."kind" IN ('quote', 'invoice')),
	CONSTRAINT "billing_document_emails_sent_check" CHECK("billing_document_emails"."sent_at_ms" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `billing_document_emails_daily_unique` ON `billing_document_emails` (`billing_document_id`,`kind`,`sent_on_day`);