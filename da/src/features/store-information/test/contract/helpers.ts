import { createApp } from "../../../../appFactory";
import { signTestAccessToken } from "../../../../test-support/authCookies";
import { loadAuthConfig } from "../../../auth/config";
import type {
  IRefreshSessionRepository,
  IUserRepository,
} from "../../../auth/IAuthRepositories";
import type { PasswordHasher } from "../../../auth/password";
import type { User } from "../../../auth/types";
import type { IStoreInformationRepository } from "../../IStoreInformationRepository";
import { EMPTY_STORE_INFORMATION, type StoreInformation } from "../../model";

const config = loadAuthConfig({
  JWT_SECRET: "store-information-contract-secret-123456",
  SPA_APP_ID: "store-information-contract-spa",
});

const admin: User = {
  id: 1,
  email: "admin@example.test",
  firstname: "Store",
  lastname: "Admin",
  passwordHash: "unused",
  role: "Admin",
  isActive: true,
  mustChangePassword: false,
  lastLoginAtEpochMs: null,
  createdAtEpochMs: 1,
  updatedAtEpochMs: 1,
};

const subadmin: User = { ...admin, id: 2, role: "Subadmin" };

class ContractUsers implements IUserRepository {
  async findByEmail() {
    return null;
  }

  async findById(id: number) {
    return [admin, subadmin].find((user) => user.id === id) ?? null;
  }

  async create(): Promise<User> {
    throw new Error("Contract test does not create users");
  }

  async updatePassword(): Promise<void> {
    throw new Error("Contract test does not update passwords");
  }

  async setRole(): Promise<void> {
    throw new Error("Contract test does not update roles");
  }

  async setActive(): Promise<void> {
    throw new Error("Contract test does not update active status");
  }

  async list(): Promise<Omit<User, "passwordHash">[]> {
    throw new Error("Contract test does not list users");
  }

  async recordLogin(): Promise<void> {
    throw new Error("Contract test does not record login");
  }

  async recordLogout(): Promise<void> {
    throw new Error("Contract test does not record logout");
  }
}

class ContractSessions implements IRefreshSessionRepository {
  async create(): Promise<void> {
    throw new Error("Contract test does not create sessions");
  }

  async findById() {
    return null;
  }

  async revoke(): Promise<void> {
    throw new Error("Contract test does not revoke sessions");
  }

  async revokeAllForUser(): Promise<void> {
    throw new Error("Contract test does not revoke sessions");
  }

  async delete(): Promise<void> {
    throw new Error("Contract test does not delete sessions");
  }

  async limitActiveSessions(): Promise<void> {
    throw new Error("Contract test does not limit sessions");
  }
}

class ContractStoreInformation implements IStoreInformationRepository {
  value = { ...EMPTY_STORE_INFORMATION };

  async get() {
    return { ...this.value };
  }

  async update(information: StoreInformation) {
    this.value = information;
    return { ...information };
  }
}

const passwords: PasswordHasher = {
  hash: async () => "unused",
  compare: async () => false,
};

export function createHarness() {
  const users = new ContractUsers();
  const repository = new ContractStoreInformation();
  const app = createApp(config, {
    users,
    sessions: new ContractSessions(),
    passwords,
    storeInformation: repository,
  });

  const request = (path: string, init: RequestInit = {}) => {
    const headers = new Headers(init.headers);
    headers.set("X-App-Id", config.appId);
    if (init.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    return app.handle(
      new Request(`http://localhost${path}`, { ...init, headers }),
    );
  };

  return {
    request,
    repository,
    adminAuthorization: `access_token=${signTestAccessToken(config.jwtSecret, admin.id, 60)}`,
    subadminAuthorization: `access_token=${signTestAccessToken(config.jwtSecret, subadmin.id, 60)}`,
    json: (body: unknown) => ({ body: JSON.stringify(body) }),
  };
}
