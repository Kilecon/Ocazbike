export type BillingDocumentKind = "quote" | "invoice";

export type BillingEmailSentAt = Partial<Record<BillingDocumentKind, number>>;

/** Records sent billing emails; at most one per document, kind and day. */
export interface IBillingEmailLog {
  /** Returns false when an email was already recorded for that day. */
  reserve(
    billingDocumentId: number,
    kind: BillingDocumentKind,
    day: string,
    sentAtMs: number,
  ): Promise<boolean>;
  release(
    billingDocumentId: number,
    kind: BillingDocumentKind,
    day: string,
  ): Promise<void>;
  lastSentAt(
    billingDocumentIds: number[],
  ): Promise<Map<number, BillingEmailSentAt>>;
}

export class InMemoryBillingEmailLog implements IBillingEmailLog {
  private readonly entries = new Map<string, number>();

  async reserve(
    billingDocumentId: number,
    kind: BillingDocumentKind,
    day: string,
    sentAtMs: number,
  ): Promise<boolean> {
    const key = `${billingDocumentId}:${kind}:${day}`;
    if (this.entries.has(key)) return false;
    this.entries.set(key, sentAtMs);
    return true;
  }

  async release(
    billingDocumentId: number,
    kind: BillingDocumentKind,
    day: string,
  ): Promise<void> {
    this.entries.delete(`${billingDocumentId}:${kind}:${day}`);
  }

  async lastSentAt(
    billingDocumentIds: number[],
  ): Promise<Map<number, BillingEmailSentAt>> {
    const result = new Map<number, BillingEmailSentAt>();
    for (const [key, sentAtMs] of this.entries) {
      const [id, kind] = key.split(":");
      const documentId = Number(id);
      if (!billingDocumentIds.includes(documentId)) continue;
      const entry = result.get(documentId) ?? {};
      const typedKind = kind as BillingDocumentKind;
      entry[typedKind] = Math.max(entry[typedKind] ?? 0, sentAtMs);
      result.set(documentId, entry);
    }
    return result;
  }
}
