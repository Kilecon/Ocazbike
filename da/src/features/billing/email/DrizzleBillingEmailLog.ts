import { and, eq, inArray, max } from "drizzle-orm";
import type { AppDatabase } from "../../../shared/database/db";
import { billingDocumentEmails } from "../../../shared/database/schema/billing";
import type {
  BillingDocumentKind,
  BillingEmailSentAt,
  IBillingEmailLog,
} from "./IBillingEmailLog";

export class DrizzleBillingEmailLog implements IBillingEmailLog {
  constructor(private readonly db: AppDatabase) {}

  async reserve(
    billingDocumentId: number,
    kind: BillingDocumentKind,
    day: string,
    sentAtMs: number,
  ): Promise<boolean> {
    const inserted = this.db
      .insert(billingDocumentEmails)
      .values({ billingDocumentId, kind, sentOnDay: day, sentAtMs })
      .onConflictDoNothing()
      .returning({ id: billingDocumentEmails.id })
      .all();
    return inserted.length > 0;
  }

  async release(
    billingDocumentId: number,
    kind: BillingDocumentKind,
    day: string,
  ): Promise<void> {
    this.db
      .delete(billingDocumentEmails)
      .where(
        and(
          eq(billingDocumentEmails.billingDocumentId, billingDocumentId),
          eq(billingDocumentEmails.kind, kind),
          eq(billingDocumentEmails.sentOnDay, day),
        ),
      )
      .run();
  }

  async lastSentAt(
    billingDocumentIds: number[],
  ): Promise<Map<number, BillingEmailSentAt>> {
    const result = new Map<number, BillingEmailSentAt>();
    if (billingDocumentIds.length === 0) return result;
    const rows = this.db
      .select({
        billingDocumentId: billingDocumentEmails.billingDocumentId,
        kind: billingDocumentEmails.kind,
        sentAtMs: max(billingDocumentEmails.sentAtMs),
      })
      .from(billingDocumentEmails)
      .where(
        inArray(billingDocumentEmails.billingDocumentId, billingDocumentIds),
      )
      .groupBy(
        billingDocumentEmails.billingDocumentId,
        billingDocumentEmails.kind,
      )
      .all();
    for (const row of rows) {
      if (row.sentAtMs === null) continue;
      const entry = result.get(row.billingDocumentId) ?? {};
      entry[row.kind] = row.sentAtMs;
      result.set(row.billingDocumentId, entry);
    }
    return result;
  }
}
