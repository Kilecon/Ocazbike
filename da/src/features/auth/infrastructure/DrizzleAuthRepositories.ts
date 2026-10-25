import {
  and,
  asc,
  desc,
  eq,
  gt,
  inArray,
  isNotNull,
  isNull,
  lte,
  or,
} from "drizzle-orm";
import type { AppDatabase } from "../../../shared/database/db";
import { refreshSessions, users } from "../../../shared/database/schema/auth";
import type { ClientDataProtector } from "../../clients/crypto/ClientDataProtector";
import type {
  RefreshSession,
  RefreshSessionRepository,
  UserRepository,
} from "../repositories";
import type { User, UserRole } from "../types";

const userStorageColumns = {
  id: users.id,
  email: users.email,
  firstname: users.firstname,
  lastname: users.lastname,
  encryptionSalt: users.encryptionSalt,
  passwordHash: users.passwordHash,
  role: users.role,
  isActive: users.isActive,
  mustChangePassword: users.mustChangePassword,
  lastLoginAtEpochMs: users.lastLoginAtEpochMs,
  createdAtEpochMs: users.createdAtEpochMs,
  updatedAtEpochMs: users.updatedAtEpochMs,
};

type UserStorageRow = Pick<
  typeof users.$inferSelect,
  | "id"
  | "email"
  | "firstname"
  | "lastname"
  | "encryptionSalt"
  | "passwordHash"
  | "role"
  | "isActive"
  | "mustChangePassword"
  | "lastLoginAtEpochMs"
  | "createdAtEpochMs"
  | "updatedAtEpochMs"
>;

export class DrizzleUserRepository implements UserRepository {
  constructor(
    private readonly db: AppDatabase,
    private readonly protector: ClientDataProtector,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    const rows = await this.db
      .select(userStorageColumns)
      .from(users)
      .where(eq(users.emailLookupHash, this.protector.emailLookupHash(email)))
      .limit(1);
    return rows.length ? this.toUser(rows[0]) : null;
  }

  async findById(id: number): Promise<User | null> {
    const rows = await this.db
      .select(userStorageColumns)
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return rows.length ? this.toUser(rows[0]) : null;
  }

  async create(user: Omit<User, "id">): Promise<User> {
    const salt = this.protector.createSalt();
    const encryptedEmail = this.protector.encrypt(user.email, salt);
    const encryptedFirstname = this.protector.encrypt(user.firstname, salt);
    const encryptedLastname = this.protector.encrypt(user.lastname, salt);
    if (
      encryptedEmail === null ||
      encryptedFirstname === null ||
      encryptedLastname === null
    ) {
      throw new Error("User personal data cannot be null");
    }

    const [row] = await this.db
      .insert(users)
      .values({
        email: encryptedEmail,
        emailLookupHash: this.protector.emailLookupHash(user.email),
        firstname: encryptedFirstname,
        lastname: encryptedLastname,
        encryptionSalt: salt.toString("base64url"),
        passwordHash: user.passwordHash,
        role: user.role,
        isActive: user.isActive,
        mustChangePassword: user.mustChangePassword,
        lastLoginAtEpochMs: user.lastLoginAtEpochMs,
        createdAtEpochMs: user.createdAtEpochMs,
        updatedAtEpochMs: user.updatedAtEpochMs,
      })
      .returning(userStorageColumns);
    return mapUser(row, user.email, user.firstname, user.lastname);
  }

  async updatePassword(
    id: number,
    passwordHash: string,
    timestamp?: number,
  ): Promise<void> {
    const timestampMs = timestamp ?? Date.now();
    await this.db
      .update(users)
      .set({
        passwordHash,
        mustChangePassword: false,
        updatedAtEpochMs: timestampMs,
      })
      .where(eq(users.id, id));
  }

  async setRole(id: number, role: UserRole, timestamp?: number): Promise<void> {
    const timestampMs = timestamp ?? Date.now();
    await this.db
      .update(users)
      .set({ role, updatedAtEpochMs: timestampMs })
      .where(eq(users.id, id));
  }

  async setActive(
    id: number,
    isActive: boolean,
    timestamp?: number,
  ): Promise<void> {
    const timestampMs = timestamp ?? Date.now();
    await this.db
      .update(users)
      .set({ isActive, updatedAtEpochMs: timestampMs })
      .where(eq(users.id, id));
  }

  async list(
    activeOnly = true,
    limit = 10,
    offset = 0,
  ): Promise<Omit<User, "passwordHash">[]> {
    const query = this.db.select(userStorageColumns).from(users);
    const rows = activeOnly
      ? await query
          .where(eq(users.isActive, true))
          .orderBy(asc(users.id))
          .limit(limit)
          .offset(offset)
      : await query.orderBy(asc(users.id)).limit(limit).offset(offset);
    return rows.map((row) => {
      const { passwordHash: _passwordHash, ...user } = this.decryptRow(row);
      return user;
    });
  }

  async recordLogin(id: number, timestamp?: number): Promise<void> {
    const timestampMs = timestamp ?? Date.now();
    await this.db
      .update(users)
      .set({
        lastLoginAtEpochMs: timestampMs,
        updatedAtEpochMs: timestampMs,
      })
      .where(eq(users.id, id));
  }

  async recordLogout(id: number, timestamp?: number): Promise<void> {
    const timestampMs = timestamp ?? Date.now();
    await this.db
      .update(users)
      .set({ updatedAtEpochMs: timestampMs })
      .where(eq(users.id, id));
  }

  private async toUser(row: UserStorageRow): Promise<User> {
    return this.decryptRow(row);
  }

  private decryptRow(row: UserStorageRow): User {
    const email = this.protector.decrypt(row.email, row.encryptionSalt);
    const firstname = this.protector.decrypt(row.firstname, row.encryptionSalt);
    const lastname = this.protector.decrypt(row.lastname, row.encryptionSalt);
    if (email === null || firstname === null || lastname === null) {
      throw new Error(`User ${row.id} has incomplete encrypted personal data`);
    }
    return mapUser(row, email, firstname, lastname);
  }
}

export class DrizzleRefreshSessionRepository
  implements RefreshSessionRepository
{
  constructor(private readonly db: AppDatabase) {}

  async create(session: RefreshSession): Promise<void> {
    await this.db.insert(refreshSessions).values({
      id: session.id,
      userId: session.userId,
      tokenHash: session.tokenHash,
      expiresAt: session.expiresAt,
      revokedAt: session.revokedAt,
      userAgent: session.userAgent,
    });
  }

  async findById(id: string): Promise<RefreshSession | null> {
    const rows = await this.db
      .select({
        id: refreshSessions.id,
        userId: refreshSessions.userId,
        tokenHash: refreshSessions.tokenHash,
        expiresAt: refreshSessions.expiresAt,
        revokedAt: refreshSessions.revokedAt,
        userAgent: refreshSessions.userAgent,
      })
      .from(refreshSessions)
      .where(eq(refreshSessions.id, id))
      .limit(1);
    if (!rows.length) return null;

    const row = rows[0];
    return {
      id: row.id,
      userId: row.userId,
      tokenHash: row.tokenHash,
      expiresAt: new Date(row.expiresAt),
      revokedAt: row.revokedAt ? new Date(row.revokedAt) : null,
      userAgent: row.userAgent,
    };
  }

  async revoke(id: string, revokedAt = new Date()): Promise<void> {
    await this.db
      .update(refreshSessions)
      .set({ revokedAt })
      .where(eq(refreshSessions.id, id));
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(refreshSessions).where(eq(refreshSessions.id, id));
  }

  // Expired sessions are found through refresh_sessions_expires_at_ms_idx.
  async deleteExpired(
    now = new Date(),
    revokedRetentionMs = 7 * 24 * 60 * 60 * 1000,
  ): Promise<number> {
    const revokedBefore = new Date(now.getTime() - revokedRetentionMs);
    const deleted = await this.db
      .delete(refreshSessions)
      .where(
        or(
          lte(refreshSessions.expiresAt, now),
          and(
            isNotNull(refreshSessions.revokedAt),
            lte(refreshSessions.revokedAt, revokedBefore),
          ),
        ),
      )
      .returning({ id: refreshSessions.id });
    return deleted.length;
  }

  async limitActiveSessions(userId: number, maxActive: number): Promise<void> {
    const active = await this.db
      .select({ id: refreshSessions.id })
      .from(refreshSessions)
      .where(
        and(
          eq(refreshSessions.userId, userId),
          isNull(refreshSessions.revokedAt),
          gt(refreshSessions.expiresAt, new Date()),
        ),
      )
      .orderBy(desc(refreshSessions.createdAt), asc(refreshSessions.id));
    // Evicted sessions are deleted, not revoked, so a stale device is not mistaken for token theft.
    const evictedIds = active.slice(maxActive).map(({ id }) => id);
    if (evictedIds.length) {
      await this.db
        .delete(refreshSessions)
        .where(inArray(refreshSessions.id, evictedIds));
    }
  }

  async revokeAllForUser(userId: number): Promise<void> {
    await this.db
      .update(refreshSessions)
      .set({ revokedAt: new Date() })
      .where(eq(refreshSessions.userId, userId));
  }
}

function mapUser(
  row: UserStorageRow,
  email: string,
  firstname: string,
  lastname: string,
): User {
  return {
    id: row.id,
    email,
    firstname,
    lastname,
    passwordHash: row.passwordHash,
    role: row.role as UserRole,
    isActive: row.isActive,
    mustChangePassword: row.mustChangePassword,
    lastLoginAtEpochMs: row.lastLoginAtEpochMs,
    createdAtEpochMs: row.createdAtEpochMs,
    updatedAtEpochMs: row.updatedAtEpochMs,
  };
}
