import { and, desc, eq, isNull, lte, ne, or, sql } from "drizzle-orm";
import type { db } from "../../../shared/database/db";
import {
  supportDailySequences,
  supportRequests,
} from "../../../shared/database/schema/support";
import type { ClientDataProtector } from "../../clients/crypto/ClientDataProtector";
import type {
  CreateSupportRequestInput,
  ISupportRequestRepository,
  NotificationClaimResult,
  SupportRequestListItem,
  SupportRequestRecord,
} from "../ISupportRequestRepository";
import { formatSupportReference } from "../ISupportRequestRepository";

const NOTIFICATION_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const STALE_ATTEMPT_MS = 5 * 60 * 1000;

export class DrizzleSupportRequestRepository
  implements ISupportRequestRepository
{
  constructor(
    private readonly database: typeof db,
    private readonly protector: ClientDataProtector,
  ) {}

  async create(
    input: CreateSupportRequestInput,
  ): Promise<SupportRequestRecord> {
    return this.database.transaction((transaction) => {
      const now = new Date();
      const date = now.toISOString().slice(0, 10);
      const [sequence] = transaction
        .insert(supportDailySequences)
        .values({ date, lastNumber: 1 })
        .onConflictDoUpdate({
          target: supportDailySequences.date,
          set: {
            lastNumber: sql`${supportDailySequences.lastNumber} + 1`,
          },
        })
        .returning({ lastNumber: supportDailySequences.lastNumber })
        .all();
      const reference = formatSupportReference(
        input.type,
        date,
        sequence.lastNumber,
      );
      const salt = this.protector.createSalt();
      const [request] = transaction
        .insert(supportRequests)
        .values({
          reference,
          type: input.type,
          title: this.protector.encrypt(input.title, salt),
          description: this.protector.encrypt(input.description, salt),
          encryptionSalt: salt.toString("base64url"),
          createdByUserId: input.createdByUserId,
          createdAt: now,
          discordNotificationStatus: "pending",
        })
        .returning()
        .all();
      if (request.createdByUserId !== input.createdByUserId) {
        throw new Error("Support request creator ID was not persisted");
      }

      return this.toRecord(request);
    });
  }

  async claimNotification(
    id: number,
    now: Date,
  ): Promise<NotificationClaimResult> {
    const nowMs = now.getTime();
    const [claimed] = await this.database
      .update(supportRequests)
      .set({
        discordNotificationStatus: "sending",
        discordNotificationAttemptAt: now,
      })
      .where(
        and(
          eq(supportRequests.id, id),
          ne(supportRequests.status, "closed"),
          or(
            ne(supportRequests.discordNotificationStatus, "sending"),
            isNull(supportRequests.discordNotificationAttemptAt),
            lte(
              supportRequests.discordNotificationAttemptAt,
              new Date(nowMs - STALE_ATTEMPT_MS),
            ),
          ),
          or(
            ne(supportRequests.discordNotificationStatus, "sent"),
            isNull(supportRequests.discordNotifiedAt),
            lte(
              supportRequests.discordNotifiedAt,
              new Date(nowMs - NOTIFICATION_COOLDOWN_MS),
            ),
          ),
        ),
      )
      .returning()
      .all();

    if (claimed) return { claimed: true, request: this.toRecord(claimed) };

    const existing = await this.database
      .select()
      .from(supportRequests)
      .where(eq(supportRequests.id, id))
      .get();
    if (!existing) return { claimed: false, reason: "not_found" };
    if (existing.status === "closed") {
      return { claimed: false, reason: "closed" };
    }

    if (
      existing.discordNotificationStatus === "sending" &&
      existing.discordNotificationAttemptAt &&
      existing.discordNotificationAttemptAt.getTime() > nowMs - STALE_ATTEMPT_MS
    ) {
      return {
        claimed: false,
        reason: "in_progress",
        retryAt: new Date(
          existing.discordNotificationAttemptAt.getTime() + STALE_ATTEMPT_MS,
        ).toISOString(),
      };
    }

    if (
      existing.discordNotificationStatus === "sent" &&
      existing.discordNotifiedAt &&
      existing.discordNotifiedAt.getTime() > nowMs - NOTIFICATION_COOLDOWN_MS
    ) {
      return {
        claimed: false,
        reason: "cooldown",
        retryAt: new Date(
          existing.discordNotifiedAt.getTime() + NOTIFICATION_COOLDOWN_MS,
        ).toISOString(),
      };
    }

    return { claimed: false, reason: "in_progress" };
  }

  async completeNotification(
    id: number,
    status: "sent" | "failed",
    notifiedAt: Date,
  ): Promise<SupportRequestRecord> {
    const [updated] = await this.database
      .update(supportRequests)
      .set({
        discordNotificationStatus: status,
        ...(status === "sent"
          ? { discordNotifiedAt: notifiedAt, status: "pending" }
          : {}),
      })
      .where(eq(supportRequests.id, id))
      .returning()
      .all();
    if (!updated) throw new Error(`Support request ${id} was not found`);
    return this.toRecord(updated);
  }

  async listPage(input: {
    page: number;
    limit: number;
    type?: SupportRequestRecord["type"];
    status?: SupportRequestRecord["status"];
  }) {
    const filters = [
      ...(input.type ? [eq(supportRequests.type, input.type)] : []),
      ...(input.status ? [eq(supportRequests.status, input.status)] : []),
    ];
    const where = filters.length > 0 ? and(...filters) : undefined;
    const [{ total }] = await this.database
      .select({ total: sql<number>`count(*)` })
      .from(supportRequests)
      .where(where);
    const rows = await this.database
      .select()
      .from(supportRequests)
      .where(where)
      .orderBy(desc(supportRequests.createdAt), desc(supportRequests.id))
      .limit(input.limit)
      .offset((input.page - 1) * input.limit);

    return {
      requests: rows.map((row): SupportRequestListItem => {
        const { createdByUserId: _createdByUserId, ...request } =
          this.toRecord(row);
        return request;
      }),
      page: input.page,
      limit: input.limit,
      total,
    };
  }

  private toRecord(
    row: typeof supportRequests.$inferSelect,
  ): SupportRequestRecord {
    if (!row.encryptionSalt) {
      throw new Error(
        `Support request ${row.id} is missing its encryption salt`,
      );
    }
    const title = this.protector.decrypt(row.title, row.encryptionSalt);
    const description = this.protector.decrypt(
      row.description,
      row.encryptionSalt,
    );
    if (title === null || description === null) {
      throw new Error(
        `Support request ${row.id} has incomplete encrypted data`,
      );
    }
    return {
      id: row.id,
      reference: row.reference,
      type: row.type as SupportRequestRecord["type"],
      title,
      description,
      status: row.status as SupportRequestRecord["status"],
      createdByUserId: row.createdByUserId,
      createdAt: row.createdAt.toISOString(),
      discordNotificationStatus:
        row.discordNotificationStatus as SupportRequestRecord["discordNotificationStatus"],
      discordNotifiedAt: row.discordNotifiedAt?.toISOString() ?? null,
      discordNotificationAttemptAt:
        row.discordNotificationAttemptAt?.toISOString() ?? null,
    };
  }
}
