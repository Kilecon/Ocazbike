import { createApp } from "../../../../appFactory";
import { signTestAccessToken } from "../../../../tests-helpers/authCookies";
import {
  InMemoryRefreshSessionRepository,
  InMemoryUserRepository,
  makeContractUser,
} from "../../../../tests-helpers/inMemoryAuthRepositories";
import { createTestRequest } from "../../../../tests-helpers/testRequest";
import { loadAuthConfig } from "../../../auth/config";
import type {
  CreateSupportRequestInput,
  ISupportRequestRepository,
  NotificationClaimResult,
  SupportNotifier,
  SupportRequestPage,
  SupportRequestRecord,
} from "../../ISupportRequestRepository";

const config = loadAuthConfig({
  JWT_SECRET: "support-contract-test-secret-0123456789", // NOSONAR -- test-only JWT secret
  SPA_APP_ID: "support-contract-spa",
  BCRYPT_ROUNDS: "4",
});

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

export function createHarness() {
  const timestamp = Date.UTC(2026, 9, 1);
  const users = new InMemoryUserRepository([
    makeContractUser(1, "Admin", true, {
      email: "support-1@example.test",
      firstname: "Support1",
      timestamp,
    }),
    makeContractUser(2, "Subadmin", true, {
      email: "support-2@example.test",
      firstname: "Support2",
      timestamp,
    }),
    makeContractUser(3, "Admin", false, {
      email: "support-3@example.test",
      firstname: "Support3",
      timestamp,
    }),
  ]);
  const sessions = new InMemoryRefreshSessionRepository();
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

  const request = createTestRequest(app, config.appId);

  const authorization = (userId = 1) =>
    `access_token=${signTestAccessToken(config.jwtSecret, userId, config.accessTokenTtlSeconds)}`;
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

export { jsonBody as json } from "../../../../tests-helpers/jsonBody";
