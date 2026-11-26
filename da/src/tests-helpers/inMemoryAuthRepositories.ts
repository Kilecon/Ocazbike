import type {
  IRefreshSessionRepository,
  IUserRepository,
  RefreshSession,
  UserStatus,
} from "../features/auth/IAuthRepositories";
import type { User, UserRole } from "../features/auth/types";

interface InMemoryUserRepositoryOptions {
  defaultActiveOnly?: boolean;
  clearMustChangePassword?: boolean;
  trackLogin?: boolean;
}

interface ContractUserOptions {
  email?: string;
  firstname?: string;
  lastname?: string;
  timestamp?: number;
}

export function makeContractUser(
  id: number,
  role: UserRole,
  isActive = true,
  options: ContractUserOptions = {},
): User {
  const timestamp = options.timestamp ?? 1;
  return {
    id,
    email: options.email ?? `user${id}@example.com`,
    firstname: options.firstname ?? `User${id}`,
    lastname: options.lastname ?? "Contract",
    passwordHash: "contract-hash", // NOSONAR -- test-only password fixture
    role,
    isActive,
    mustChangePassword: false,
    lastLoginAtEpochMs: null,
    createdAtEpochMs: timestamp,
    updatedAtEpochMs: timestamp,
  };
}

export class InMemoryUserRepository implements IUserRepository {
  constructor(
    readonly values: User[],
    private readonly options: InMemoryUserRepositoryOptions = {},
  ) {}

  async findByEmail(email: string) {
    return this.values.find((user) => user.email === email) ?? null;
  }

  async findById(id: number) {
    return this.values.find((user) => user.id === id) ?? null;
  }

  async create(user: Omit<User, "id">) {
    const id = Math.max(0, ...this.values.map(({ id: userId }) => userId)) + 1;
    const created = { ...user, id };
    this.values.push(created);
    return created;
  }

  async updatePassword(id: number, passwordHash: string) {
    const user = await this.findById(id);
    if (!user) return;
    user.passwordHash = passwordHash;
    if (this.options.clearMustChangePassword) {
      user.mustChangePassword = false;
    }
  }

  async setRole(id: number, role: UserRole) {
    const user = await this.findById(id);
    if (user) user.role = role;
  }

  async setActive(id: number, isActive: boolean) {
    const user = await this.findById(id);
    if (user) user.isActive = isActive;
  }

  async list(
    activeOnly = this.options.defaultActiveOnly ?? false,
    limit = 10,
    offset = 0,
    status?: UserStatus,
  ) {
    return this.values
      .filter((user) =>
        status
          ? status === "all" || user.isActive === (status === "active")
          : !activeOnly || user.isActive,
      )
      .slice(offset, offset + limit)
      .map(({ passwordHash: _passwordHash, ...user }) => user);
  }

  async countByStatus() {
    const active = this.values.filter((user) => user.isActive).length;
    return {
      all: this.values.length,
      active,
      inactive: this.values.length - active,
    };
  }

  async recordLogin(id: number, timestamp = Date.now()) {
    if (!this.options.trackLogin) return;
    const user = await this.findById(id);
    if (user) user.lastLoginAtEpochMs = timestamp;
  }

  recordLogout() {
    return Promise.resolve();
  }
}

export class InMemoryRefreshSessionRepository
  implements IRefreshSessionRepository
{
  private readonly values = new Map<string, RefreshSession>();

  async create(session: RefreshSession) {
    this.values.set(session.id, session);
  }

  async findById(id: string) {
    return this.values.get(id) ?? null;
  }

  async revoke(id: string, revokedAt = new Date()) {
    const session = this.values.get(id);
    if (session) session.revokedAt = revokedAt;
  }

  async revokeAllForUser(userId: number) {
    for (const session of this.values.values()) {
      if (session.userId === userId) session.revokedAt = new Date();
    }
  }

  async delete(id: string) {
    this.values.delete(id);
  }

  limitActiveSessions() {
    return Promise.resolve();
  }
}
