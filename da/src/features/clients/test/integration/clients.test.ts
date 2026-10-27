import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "bun:test";
import { billingDocuments as billingDocumentsSchema } from "../../../../shared/database/schema/billing";
import {
  type ClientIntegrationFixture,
  createClientIntegrationFixture,
} from "./helpers";

let fixture: ClientIntegrationFixture;

beforeAll(() => {
  fixture = createClientIntegrationFixture("clients-http-integration");
});

beforeEach(() => fixture.reset());

afterAll(() => fixture?.cleanup());

async function authorization(user = fixture.admin) {
  const response = await fixture.login(user);
  expect(response.status).toBe(200);
  const body = await response.json();
  return `Bearer ${body.accessToken}`;
}

describe("clients HTTP integration", () => {
  it("persists encrypted client data and exposes different list and detail projections", async () => {
    const token = await authorization();
    const created = await fixture.request("/clients", {
      method: "POST",
      headers: { Authorization: token },
      body: JSON.stringify({
        firstname: "Ada",
        lastname: "Lovelace",
        email: "ada@example.com",
        phonenumber: "0600000000",
        address: "1 rue de Rivoli",
        addressComplement: "Bâtiment A",
        identityCardNumber: "ID-123",
        privatenote: "Sensitive note",
      }),
    });
    expect(created.status).toBe(201);
    const createdBody = await created.json();
    expect(createdBody).toMatchObject({
      firstname: "Ada",
      addressComplement: "Bâtiment A",
      identityCardNumber: "ID-123",
      privatenote: "Sensitive note",
      modifiedByUserId: fixture.admin.id,
      createdAtMs: expect.any(Number),
      lastModificationMs: expect.any(Number),
    });
    const clientId = createdBody.id as number;

    const stored = fixture.database.sqlite
      .query(
        "SELECT firstname, email, address_complement, identity_card_number, privatenote, encryption_salt FROM clients WHERE id = ?",
      )
      .get(clientId) as Record<string, string | null>;
    expect(stored.firstname).not.toContain("Ada");
    expect(stored.email).not.toContain("ada@example.com");
    expect(stored.address_complement).not.toContain("Bâtiment A");
    expect(stored.identity_card_number).not.toContain("ID-123");
    expect(stored.privatenote).not.toContain("Sensitive note");
    expect(stored.encryption_salt).toBeTruthy();

    const list = await fixture.request("/clients", {
      headers: { Authorization: token },
    });
    const listBody = await list.json();
    expect(list.status).toBe(200);
    expect(listBody.clients[0]).toMatchObject({
      id: clientId,
      firstname: "Ada",
      email: "ada@example.com",
      addressComplement: "Bâtiment A",
    });
    for (const hidden of [
      "identityCardNumber",
      "privatenote",
      "modifiedByUserId",
      "lastModificationMs",
      "createdAtMs",
    ]) {
      expect(listBody.clients[0]).not.toHaveProperty(hidden);
    }

    const detail = await fixture.request(`/clients/${clientId}`, {
      headers: { Authorization: token },
    });
    expect(detail.status).toBe(200);
    expect(await detail.json()).toMatchObject({
      id: clientId,
      identityCardNumber: "ID-123",
      privatenote: "Sensitive note",
      lastModificationMs: createdBody.lastModificationMs,
      createdAtMs: createdBody.createdAtMs,
    });
  });

  it("searches encrypted records and replaces stale search terms after updates", async () => {
    const token = await authorization();
    const created = await fixture.request("/clients", {
      method: "POST",
      headers: { Authorization: token },
      body: JSON.stringify({
        firstname: "Zoé",
        lastname: "Martin",
        email: "zoe@example.com",
        isProfessional: true,
        companyName: "Atelier Ancien",
      }),
    });
    const { id } = await created.json();

    const accentSearch = await fixture.request("/clients?search=zoe", {
      headers: { Authorization: token },
    });
    expect((await accentSearch.json()).clients[0].id).toBe(id);

    const update = await fixture.request(`/clients/${id}`, {
      method: "PUT",
      headers: { Authorization: token },
      body: JSON.stringify({
        firstname: "Zoé",
        lastname: "Martin",
        email: "zoe@example.com",
        isProfessional: true,
        companyName: "Atelier Nouveau",
      }),
    });
    expect(update.status).toBe(200);

    const oldSearch = await fixture.request(
      "/clients?search=Atelier%20Ancien",
      { headers: { Authorization: token } },
    );
    const newSearch = await fixture.request(
      "/clients?search=Atelier%20Nouveau",
      { headers: { Authorization: token } },
    );
    expect((await oldSearch.json()).total).toBe(0);
    expect((await newSearch.json()).clients[0].id).toBe(id);
  });

  it("keeps billing documents separate from client details", async () => {
    const token = await authorization();
    const created = await fixture.clients.create(
      {
        firstname: "Grace",
        lastname: "Hopper",
        email: "grace@example.com",
      },
      fixture.admin.id,
    );
    const [document] = await fixture.database.database
      .insert(billingDocumentsSchema)
      .values({
        clientId: created.id,
        type: "repair",
        dateMs: 1_798_000_000_000,
        status: "in_progress",
      })
      .returning();

    const detail = await fixture.request(`/clients/${created.id}`, {
      headers: { Authorization: token },
    });
    const documents = await fixture.request(
      `/clients/${created.id}/documents`,
      { headers: { Authorization: token } },
    );

    expect(await detail.json()).not.toHaveProperty("operations");
    expect(await documents.json()).toMatchObject([
      { id: document.id, clientId: created.id, type: "repair" },
    ]);
  });

  it("enforces Admin-only updates while allowing authenticated Subadmin reads and creation", async () => {
    const subadminToken = await authorization(fixture.subadmin);
    const created = await fixture.request("/clients", {
      method: "POST",
      headers: { Authorization: subadminToken },
      body: JSON.stringify({
        firstname: "Katherine",
        lastname: "Johnson",
        phonenumber: "0600000001",
      }),
    });
    expect(created.status).toBe(201);
    const { id } = await created.json();

    const read = await fixture.request(`/clients/${id}`, {
      headers: { Authorization: subadminToken },
    });
    expect(read.status).toBe(200);
    const update = await fixture.request(`/clients/${id}`, {
      method: "PUT",
      headers: { Authorization: subadminToken },
      body: JSON.stringify({
        firstname: "Katherine",
        lastname: "Johnson",
        phonenumber: "0600000002",
      }),
    });
    expect(update.status).toBe(403);
  });
});
