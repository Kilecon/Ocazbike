import { describe, expect, it } from "bun:test";
import type {
  ClientPage,
  ClientRecord,
  CreateClientInput,
  IClientRepository,
} from "../../IClientRepository";
import { ClientService } from "../../service";

function createClientRecord(
  overrides: Partial<ClientRecord> = {},
): ClientRecord {
  return {
    id: 1,
    firstname: "Ada",
    lastname: "Lovelace",
    email: "ada@example.com",
    phonenumber: "0600000000",
    address: "1 rue de Rivoli",
    addressComplement: "Bâtiment A",
    identityCardNumber: "ID-123",
    privatenote: "Sensitive note",
    isProfessional: true,
    siret: "12345678901234",
    companyName: "Analytical Engines",
    modifiedByUserId: 7,
    lastModificationMs: 200,
    createdAtMs: 100,
    ...overrides,
  };
}

function createRepository(client = createClientRecord()) {
  const calls: string[] = [];
  const repository: IClientRepository = {
    async create(_input: CreateClientInput, actorUserId: number) {
      calls.push(`create:${actorUserId}`);
      return client;
    },
    async update(id: number, _input: CreateClientInput, actorUserId: number) {
      calls.push(`update:${id}:${actorUserId}`);
      return id === client.id ? client : null;
    },
    async getById(id: number) {
      calls.push(`get:${id}`);
      return id === client.id ? client : null;
    },
    async listPage(input) {
      calls.push(`list:${input.page}:${input.limit}:${input.search ?? ""}`);
      const page: ClientPage = {
        clients: [client],
        page: input.page,
        limit: input.limit,
        total: 1,
      };
      return page;
    },
  };
  return { calls, repository };
}

describe("ClientService", () => {
  it("preserves the create response and forwards the authenticated actor", async () => {
    const client = createClientRecord();
    const { calls, repository } = createRepository(client);
    const service = new ClientService(repository);

    await expect(
      service.createClient(
        { firstname: "Ada", lastname: "Lovelace", email: "ada@example.com" },
        7,
      ),
    ).resolves.toEqual(client);
    expect(calls).toEqual(["create:7"]);
  });

  it("projects detail and update responses without the internal modifier id", async () => {
    const client = createClientRecord();
    const { calls, repository } = createRepository(client);
    const service = new ClientService(repository);
    const expectedDetail = {
      id: 1,
      firstname: "Ada",
      lastname: "Lovelace",
      email: "ada@example.com",
      phonenumber: "0600000000",
      address: "1 rue de Rivoli",
      addressComplement: "Bâtiment A",
      identityCardNumber: "ID-123",
      privatenote: "Sensitive note",
      isProfessional: true,
      siret: "12345678901234",
      companyName: "Analytical Engines",
      lastModificationMs: 200,
      createdAtMs: 100,
    };

    const detail = await service.getClient(1);
    const updated = await service.updateClient(
      1,
      { firstname: "Ada", lastname: "Lovelace", email: "ada@example.com" },
      7,
    );

    expect(detail).toEqual(expectedDetail);
    expect(updated).toEqual(expectedDetail);
    expect(detail).not.toHaveProperty("modifiedByUserId");
    expect(calls).toEqual(["get:1", "update:1:7"]);
  });

  it("projects the public list fields and preserves pagination metadata", async () => {
    const { calls, repository } = createRepository();
    const service = new ClientService(repository);

    const page = await service.listClients({
      page: 2,
      limit: 5,
      search: "ada",
    });

    expect(page).toEqual({
      clients: [
        {
          id: 1,
          firstname: "Ada",
          lastname: "Lovelace",
          email: "ada@example.com",
          phonenumber: "0600000000",
          address: "1 rue de Rivoli",
          addressComplement: "Bâtiment A",
          isProfessional: true,
          siret: "12345678901234",
          companyName: "Analytical Engines",
        },
      ],
      page: 2,
      limit: 5,
      total: 1,
    });
    expect(page.clients[0]).not.toHaveProperty("identityCardNumber");
    expect(page.clients[0]).not.toHaveProperty("privatenote");
    expect(page.clients[0]).not.toHaveProperty("modifiedByUserId");
    expect(calls).toEqual(["list:2:5:ada"]);
  });

  it("passes not-found results through without success-shaped fallbacks", async () => {
    const { repository } = createRepository();
    const service = new ClientService(repository);

    await expect(service.getClient(99)).resolves.toBeNull();
    await expect(
      service.updateClient(
        99,
        { firstname: "Nobody", lastname: "Missing", email: "n@example.com" },
        7,
      ),
    ).resolves.toBeNull();
  });
});
