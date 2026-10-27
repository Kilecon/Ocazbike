import { createApp } from "../../../../appFactory";
import { loadAuthConfig } from "../../../auth/config";
import { JwtService } from "../../../auth/jwt";
import type {
  RefreshSession,
  RefreshSessionRepository,
  UserRepository,
} from "../../../auth/repositories";
import type { User, UserRole } from "../../../auth/types";
import type {
  CreateSupportRequestInput,
  ISupportRequestRepository,
  NotificationClaimResult,
  SupportNotifier,
  SupportRequestPage,
  SupportRequestRecord,
} from "../../ISupportRequestRepository";

const config = loadAuthConfig({
  JWT_SECRET: "support-contract-test-secret-0123456789",
  SPA_APP_ID: "support-contract-spa",
  BCRYPT_ROUNDS: "4",
});
const jwt = new JwtService(config.jwtSecret);

class ContractUsers implements UserRepository {
  readonly values: User[] = [
    makeUser(1, "Admin"),
    makeUser(2, "Subadmin"),
    makeUser(3, "Admin", false),
  ];

  async findByEmail(email: string) {
    return this.values.find((user) => user.email === email) ?? null;
  }

  async findById(id: number) {
    return this.values.find((user) => user.id === id) ?? null;
  }

  async create(user: Omit<User, "id">) {
    const created = { ...user, id: this.values.length + 1 };
    this.values.push(created);
    return created;
  }

  async updatePassword(id: number, passwordHash: string) {
    const user = await this.findById(id);
    if (user) user.passwordHash = passwordHash;
  }

  async setRole(id: number, role: UserRole) {
    const user = await this.findById(id);
    if (user) user.role = role;
  }

  async setActive(id: number, isActive: boolean) {
    const user = await this.findById(id);
    if (user) user.isActive = isActive;
  }

  async list() {
    return this.values.map(({ passwordHash: _passwordHash, ...user }) => user);
  }

  async recordLogin() {}
  async recordLogout() {}
}

class ContractSessions implements RefreshSessionRepository {
  async create(_session: RefreshSession) {}
  async findById(_id: string) {
    return null;
  }
  async revoke(_id: string) {}
  async revokeAllForUser(_userId: number) {}
  async delete(_id: string) {}
  async limitActiveSessions(_userId: number, _maxActive: number) {}
}

class ContractSupportRequests implements ISupportRequestRepository {
  readonly values: SupportRequestRecord[] = [];

  async create(input: CreateSupportRequestInput) {
    const date = new Date().toISOString().slice(0, 10);
    const sequence = this.values.length + 1;
    const record: SupportRequestRecord = {
      ...input,
      id: sequence,
      reference: `${input.type}-${date}-${String(sequence).padStart(3, "0")}`,
      status: "created",
      createdAt: new Date().toISOString(),
      discordNotificationStatus: "pending",
      discordNotifiedAt: null,
      discordNotificationAttemptAt: null,
    };
    this.values.push(record);
    return record;
  }

  async claimNotification(
    id: number,
    now: Date,
  ): Promise<NotificationClaimResult> {
    const request = this.values.find((value) => value.id === id);
    if (!request) return { claimed: false, reason: "not_found" };
    if (request.status === "closed") {
      return { claimed: false, reason: "closed" };
    }
    if (request.discordNotificationStatus === "sending") {
      return { claimed: false, reason: "in_progress" };
    }
    if (
      request.discordNotificationStatus === "sent" &&
      request.discordNotifiedAt &&
      Date.parse(request.discordNotifiedAt) > now.getTime() - 86_400_000
    ) {
      return { claimed: false, reason: "cooldown" };
    }
    request.discordNotificationStatus = "sending";
    request.discordNotificationAttemptAt = now.toISOString();
    return { claimed: true, request };
  }

  async completeNotification(
    id: number,
    status: "sent" | "failed",
    notifiedAt: Date,
  ) {
    const request = this.values.find((value) => value.id === id);
    if (!request) throw new Error(`Support request ${id} was not found`);
    request.discordNotificationStatus = status;
    if (status === "sent") {
      request.discordNotifiedAt = notifiedAt.toISOString();
      request.status = "pending";
    }
    return request;
  }

  async listPage(input: {
    page: number;
    limit: number;
    type?: SupportRequestRecord["type"];
    status?: SupportRequestRecord["status"];
  }): Promise<SupportRequestPage> {
    const matches = this.values
      .filter(
        (request) =>
          (!input.type || request.type === input.type) &&
          (!input.status || request.status === input.status),
      )
      .toReversed();
    const offset = (input.page - 1) * input.limit;
    return {
      requests: matches
        .slice(offset, offset + input.limit)
        .map(({ createdByUserId: _createdByUserId, ...request }) => request),
      page: input.page,
      limit: input.limit,
      total: matches.length,
    };
  }
}

function makeUser(id: number, role: UserRole, isActive = true): User {
  const timestamp = Date.UTC(2026, 9, 1);
  return {
    id,
    email: `support-${id}@example.test`,
    firstname: `Support${id}`,
    lastname: "Contract",
    passwordHash: "contract-hash",
    role,
    isActive,
    mustChangePassword: false,
    lastLoginAtEpochMs: null,
    createdAtEpochMs: timestamp,
    updatedAtEpochMs: timestamp,
  };
}

export function createHarness() {
  const users = new ContractUsers();
  const sessions = new ContractSessions();
  const supportRequests = new ContractSupportRequests();
  const notifications: SupportRequestRecord[] = [];
  let notificationFails = false;
  const notifier: SupportNotifier = {
    async notify(request) {
      if (notificationFails) throw new Error("Discord unavailable");
      notifications.push(request);
    },
  };
  const app = createApp(config, {
    users,
    sessions,
    passwords: {
      hash: async (value) => value,
      compare: async (value, hash) => value === hash,
    },
    supportRequests,
    supportNotifier: notifier,
  });

  const request = (path: string, init: RequestInit = {}) => {
    const headers = new Headers({
      "X-App-Id": config.appId,
      ...Object.fromEntries(new Headers(init.headers).entries()),
    });
    if (init.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    return app.handle(
      new Request(`http://localhost${path}`, { ...init, headers }),
    );
  };

  const authorization = (userId = 1) =>
    `Bearer ${jwt.signAccessToken(userId, config.accessTokenTtlSeconds)}`;
  const setNotificationFailure = (fails: boolean) => {
    notificationFails = fails;
  };

  return {
    notifications,
    request,
    authorization,
    setNotificationFailure,
    supportRequests,
  };
}

export const json = (body: unknown) => ({
  "Content-Type": "application/json",
  body: JSON.stringify(body),
});
