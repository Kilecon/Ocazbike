import type { User, UserRole } from "./types";

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: number): Promise<User | null>;
  create(user: Omit<User, "id">): Promise<User>;
  updatePassword(
    id: number,
    passwordHash: string,
    timestamp?: number,
  ): Promise<void>;
  setRole(id: number, role: UserRole, timestamp?: number): Promise<void>;
  setActive(id: number, isActive: boolean, timestamp?: number): Promise<void>;
  list(
    activeOnly?: boolean,
    limit?: number,
    offset?: number,
  ): Promise<Omit<User, "passwordHash">[]>;
  recordLogin(id: number, timestamp?: number): Promise<void>;
  recordLogout(id: number, timestamp?: number): Promise<void>;
}

export interface RefreshSession {
  id: string;
  userId: number;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  userAgent: string | null;
}

export interface RefreshSessionRepository {
  create(session: RefreshSession): Promise<void>;
  findById(id: string): Promise<RefreshSession | null>;
  revoke(id: string, revokedAt?: Date): Promise<void>;
  revokeAllForUser(userId: number): Promise<void>;
  delete(id: string): Promise<void>;
  limitActiveSessions(userId: number, maxActive: number): Promise<void>;
}
