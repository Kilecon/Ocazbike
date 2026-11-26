import { createApp } from "../../../../appFactory";
import { signTestAccessToken } from "../../../../tests-helpers/authCookies";
import {
  InMemoryRefreshSessionRepository,
  InMemoryUserRepository,
  makeContractUser,
} from "../../../../tests-helpers/inMemoryAuthRepositories";
import { jsonBody as json } from "../../../../tests-helpers/jsonBody";
import { createTestRequest } from "../../../../tests-helpers/testRequest";
import { loadAuthConfig } from "../../../auth/config";
import type { IBillingDocumentRepository } from "../../../billing/IBillingDocumentRepository";
import { emptyOperationCounts } from "../../../billing/IBillingDocumentRepository";
import type {
  ClientRecord,
  CreateClientInput,
  IClientRepository,
} from "../../IClientRepository";

const config = loadAuthConfig({
  JWT_SECRET: "c".repeat(32), // NOSONAR -- test-only JWT secret
  SPA_APP_ID: "clients-contract-spa",
  BCRYPT_ROUNDS: "4",
});

class ContractClients implements IClientRepository {
  readonly values: ClientRecord[] = [];

  async create(input: CreateClientInput, actorUserId: number) {
    const timestamp = Date.now();
    const professional = input.isProfessional === true ? input : undefined;
    const client: ClientRecord = {
      id: this.values.length + 1,
      firstname: input.firstname,
      lastname: input.lastname,
      email: input.email?.trim() ?? "",
      phonenumber: input.phonenumber?.trim() ?? "",
      address: input.address ?? null,
      addressComplement: input.addressComplement ?? null,
      identityCardNumber: input.identityCardNumber?.trim() || null,
      privatenote: input.privatenote ?? null,
      isProfessional: Boolean(professional),
      siret: professional?.siret?.trim() || null,
      companyName: professional?.companyName?.trim() || null,
      modifiedByUserId: actorUserId,
      lastModificationMs: timestamp,
      createdAtMs: timestamp,
    };
    this.values.push(client);
    return client;
  }

  async update(id: number, input: CreateClientInput, actorUserId: number) {
    const index = this.values.findIndex((client) => client.id === id);
    if (index < 0) return null;

    const previous = this.values[index];
    const updated = await this.create(input, actorUserId);
    this.values.pop();
    const result = {
      ...updated,
      id,
      createdAtMs: previous.createdAtMs,
      lastModificationMs: Math.max(Date.now(), previous.lastModificationMs + 1),
    };
    this.values[index] = result;
    return result;
  }

  async getById(id: number) {
    return this.values.find((client) => client.id === id) ?? null;
  }

  async listPage(input: { page: number; limit: number; search?: string }) {
    const search = input.search?.normalize("NFKD").toLowerCase().trim();
    const filtered = this.values.filter((client) => {
      if (!search) return true;
      return [
        client.firstname,
        client.lastname,
        client.email,
        client.phonenumber,
        client.address ?? "",
        client.addressComplement ?? "",
        client.privatenote ?? "",
        client.siret ?? "",
        client.companyName ?? "",
      ].some((value) => value.normalize("NFKD").toLowerCase().includes(search));
    });
    const offset = (input.page - 1) * input.limit;
    return {
      clients: filtered.slice(offset, offset + input.limit),
      page: input.page,
      limit: input.limit,
      total: filtered.length,
    };
  }
}

export function createHarness() {
  const users = new InMemoryUserRepository(
    [
      makeContractUser(1, "Admin"),
      makeContractUser(2, "Subadmin"),
      makeContractUser(3, "Subadmin", false),
    ],
    { defaultActiveOnly: true },
  );
  const clients = new ContractClients();
  const billingDocuments: IBillingDocumentRepository = {
    async countOperations() {
      return emptyOperationCounts();
    },
    async listOperations() {
      return { operations: [], page: 1, limit: 20, total: 0 };
    },
    async getOperation() {
      return null;
    },
    async createOperation() {
      return null;
    },
    async acceptQuote() {
      return null;
    },
    async rejectQuote() {
      return null;
    },
    async completeOperation() {
      return null;
    },
    async payOperation() {
      return null;
    },
  };
  const app = createApp(config, {
    users,
    sessions: new InMemoryRefreshSessionRepository(),
    passwords: {
      hash: async (value) => value,
      compare: async (value, hash) => value === hash,
    },
    clients,
    billingDocuments,
  });

  const request = createTestRequest(app, config.appId);

  const authorization = (userId = 1) =>
    `access_token=${signTestAccessToken(config.jwtSecret, userId, config.accessTokenTtlSeconds)}`;
  return { clients, json, request, authorization, users };
}
