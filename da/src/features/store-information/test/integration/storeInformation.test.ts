import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { createApp } from "../../../../appFactory";
import { DataProtector } from "../../../../shared/crypto/DataProtector";
import { storeInformation as storeInformationTable } from "../../../../shared/database/schema/storeInformation";
import { accessTokenFrom } from "../../../../test-support/authCookies";
import { createTestDatabase } from "../../../../test-support/testDatabase";
import { loadAuthConfig } from "../../../auth/config";
import {
  DrizzleRefreshSessionRepository,
  DrizzleUserRepository,
} from "../../../auth/infrastructure/DrizzleAuthRepositories";
import { BcryptPasswordHasher } from "../../../auth/password";
import { DrizzleStoreInformationRepository } from "../../infrastructure/DrizzleStoreInformationRepository";
import type { StoreInformation } from "../../model";

const config = loadAuthConfig({
  JWT_SECRET: "store-information-test-secret-123456789",
  SPA_APP_ID: "store-information-test-spa",
  BCRYPT_ROUNDS: "4",
});

describe("store information routes", () => {
  const database = createTestDatabase("store-information");
  const protector = new DataProtector(Buffer.alloc(32, 71));
  const users = new DrizzleUserRepository(database.database, protector);
  const sessions = new DrizzleRefreshSessionRepository(database.database);
  const passwords = new BcryptPasswordHasher(config.bcryptRounds);
  const repository = new DrizzleStoreInformationRepository(
    database.database,
    protector,
  );
  const app = createApp(config, {
    users,
    sessions,
    passwords,
    storeInformation: repository,
  });
  let adminToken = "";
  let subadminToken = "";

  beforeAll(async () => {
    const now = Date.now();
    const passwordHash = await passwords.hash("integration-password");
    const admin = await users.create({
      email: "store-admin@example.com",
      firstname: "Store",
      lastname: "Admin",
      passwordHash,
      role: "Admin",
      isActive: true,
      mustChangePassword: false,
      lastLoginAtEpochMs: null,
      createdAtEpochMs: now,
      updatedAtEpochMs: now,
    });
    const subadmin = await users.create({
      email: "store-subadmin@example.com",
      firstname: "Store",
      lastname: "Subadmin",
      passwordHash,
      role: "Subadmin",
      isActive: true,
      mustChangePassword: false,
      lastLoginAtEpochMs: null,
      createdAtEpochMs: now,
      updatedAtEpochMs: now,
    });
    adminToken = await login(admin.email);
    subadminToken = await login(subadmin.email);
  });

  afterAll(() => database.cleanup());

  it("restricts access to admins and encrypts updated information at rest", async () => {
    const emptyResponse = await request("/store-information", {
      headers: authHeaders(adminToken),
    });
    expect(emptyResponse.status).toBe(200);
    expect(await emptyResponse.json()).toEqual({
      name: "",
      address: "",
      phone: "",
      email: "",
      siret: "",
      apeCode: "",
      vatNumber: "",
      bankName: "",
      iban: "",
      bic: "",
    });

    const unauthorizedResponse = await request("/store-information");
    expect(unauthorizedResponse.status).toBe(401);

    const subadminResponse = await request("/store-information", {
      headers: authHeaders(subadminToken),
    });
    expect(subadminResponse.status).toBe(403);

    const information: StoreInformation = {
      name: "Ocazbike",
      address: "8 Avenue de Picot\n33320 Eysines",
      phone: "06 95 07 94 94",
      email: "ocazbike@example.fr",
      siret: "90768904600015",
      apeCode: "4649Z",
      vatNumber: "FR21907689046",
      bankName: "Crédit Agricole",
      iban: "FR761234",
      bic: "AGRIFRPP833",
    };
    const updateResponse = await request("/store-information", {
      method: "PUT",
      headers: authHeaders(adminToken, true),
      body: JSON.stringify(information),
    });
    expect(updateResponse.status).toBe(200);
    expect(await updateResponse.json()).toEqual(information);

    const [stored] = await database.database
      .select()
      .from(storeInformationTable);
    expect(stored.encryptedPayload).not.toContain(information.email);
    expect(stored.encryptedPayload).not.toContain(information.iban);
    const decrypted = protector
      .createFieldProtector(Buffer.from(stored.encryptionSalt, "base64url"))
      .decrypt(stored.encryptedPayload);
    expect(decrypted).toBe(JSON.stringify(information));

    const readResponse = await request("/store-information", {
      headers: authHeaders(adminToken),
    });
    expect(await readResponse.json()).toEqual(information);
  });

  async function login(email: string): Promise<string> {
    const response = await request("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "integration-password" }),
    });
    expect(response.status).toBe(200);
    return accessTokenFrom(response);
  }

  function authHeaders(token: string, withJson = false): HeadersInit {
    return {
      Cookie: `access_token=${token}`,
      ...(withJson ? { "Content-Type": "application/json" } : {}),
    };
  }

  function request(path: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers({
      "X-App-Id": config.appId,
    });
    new Headers(init.headers).forEach((value, key) => {
      headers.set(key, value);
    });
    return app.handle(
      new Request(`http://localhost${path}`, { ...init, headers }),
    );
  }
});
