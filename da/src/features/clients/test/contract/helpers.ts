import { createApp } from "../../../../appFactory";
import { loadAuthConfig } from "../../../auth/config";
import { JwtService } from "../../../auth/jwt";
import type {
  RefreshSession,
  RefreshSessionRepository,
  UserRepository,
} from "../../../auth/repositories";
import type { User, UserRole } from "../../../auth/types";
import type { IBillingDocumentRepository } from "../../../billing/IBillingDocumentRepository";
import { ClientDataProtector } from "../../crypto/ClientDataProtector";
import type {
  ClientRecord,
  CreateClientInput,
  IClientRepository,
} from "../../IClientRepository";

const config = loadAuthConfig({
  JWT_SECRET: "c".repeat(32),
  SPA_APP_ID: "clients-contract-spa",
  BCRYPT_ROUNDS: "4",
});
const jwt = new JwtService(config.jwtSecret);

class ContractUsers implements UserRepository {
  readonly values: User[] = [
    makeUser(1, "Admin"),
    makeUser(2, "Subadmin"),
    makeUser(3, "Subadmin", false),
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

  async list(activeOnly = true, limit = 10, offset = 0) {
    return this.values
      .filter((user) => !activeOnly || user.isActive)
      .slice(offset, offset + limit)
      .map(({ passwordHash: _passwordHash, ...user }) => user);
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

function makeUser(id: number, role: UserRole, isActive = true): User {
  return {
    id,
    email: `user${id}@example.com`,
    firstname: `User${id}`,
    lastname: "Contract",
    passwordHash: "contract-hash",
    role,
    isActive,
    mustChangePassword: false,
    lastLoginAtEpochMs: null,
    createdAtEpochMs: 1,
    updatedAtEpochMs: 1,
  };
}

export function createHarness() {
  const users = new ContractUsers();
  const clients = new ContractClients();
  const billingDocuments: IBillingDocumentRepository = {
    async listForClient() {
      return [];
    },
    async listActiveRepairs() {
      return [];
    },
    async createForClient() {
      return null;
    },
  };
  const app = createApp(config, {
    users,
    sessions: new ContractSessions(),
    passwords: {
      hash: async (value) => value,
      compare: async (value, hash) => value === hash,
    },
    clients,
    billingDocuments,
    clientDataProtector: new ClientDataProtector(Buffer.alloc(32, 46)),
  });

  const request = (path: string, init: RequestInit = {}) => {
    const headers = new Headers({ "X-App-Id": "clients-contract-spa" });
    new Headers(init.headers).forEach((value, key) => {
      headers.set(key, value);
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
  const json = (body: unknown) => ({
    "Content-Type": "application/json",
    body: JSON.stringify(body),
  });

  return { clients, json, request, authorization, users };
}
