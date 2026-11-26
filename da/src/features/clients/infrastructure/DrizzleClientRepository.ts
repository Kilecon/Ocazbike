import { desc, eq, inArray, sql } from "drizzle-orm";
import type {
  DataProtector,
  FieldProtector,
} from "../../../shared/crypto/DataProtector";
import type { AppDatabase } from "../../../shared/database/db";
import {
  clientSearchTrigrams,
  clients,
} from "../../../shared/database/schema/billing";
import {
  decryptClient,
  normalizeClientSearch,
  searchableValues,
  searchTokensForSearch,
  searchTokensForValues,
} from "../crypto/clientCrypto";
import type {
  ClientRecord,
  CreateClientInput,
  IClientRepository,
} from "../IClientRepository";

export class DrizzleClientRepository implements IClientRepository {
  constructor(
    private readonly database: AppDatabase,
    private readonly protector: DataProtector,
  ) {}

  create(input: CreateClientInput, actorUserId: number): Promise<ClientRecord> {
    const salt = this.protector.createSalt();
    const fieldProtector = this.protector.createFieldProtector(salt);
    const timestampMs = Date.now();

    return Promise.resolve(
      this.database.transaction((transaction) => {
        const [row] = transaction
          .insert(clients)
          .values({
            ...this.encryptInput(input, fieldProtector),
            encryptionSalt: salt.toString("base64url"),
            modifiedByUserId: actorUserId,
            lastModificationMs: timestampMs,
            createdAtMs: timestampMs,
          })
          .returning()
          .all();
        this.replaceSearchIndex(transaction, row.id, input, false);
        return this.toClientRecord(row, fieldProtector);
      }),
    );
  }

  update(
    id: number,
    input: CreateClientInput,
    actorUserId: number,
  ): Promise<ClientRecord | null> {
    return Promise.resolve(
      this.database.transaction((transaction) => {
        const existing = transaction
          .select()
          .from(clients)
          .where(eq(clients.id, id))
          .get();
        if (!existing) return null;

        const salt = Buffer.from(existing.encryptionSalt ?? "", "base64url");
        const fieldProtector = this.protector.createFieldProtector(salt);
        decryptClient(this.protector, existing, fieldProtector);
        const timestampMs = Math.max(
          Date.now(),
          existing.lastModificationMs + 1,
        );
        const [row] = transaction
          .update(clients)
          .set({
            ...this.encryptInput(input, fieldProtector),
            modifiedByUserId: actorUserId,
            lastModificationMs: timestampMs,
          })
          .where(eq(clients.id, id))
          .returning()
          .all();

        this.replaceSearchIndex(transaction, id, input);
        return this.toClientRecord(row, fieldProtector);
      }),
    );
  }

  getById(id: number): Promise<ClientRecord | null> {
    const row = this.database
      .select()
      .from(clients)
      .where(eq(clients.id, id))
      .get();
    return Promise.resolve(row ? this.toClientRecord(row) : null);
  }

  listPage(input: { page: number; limit: number; search?: string }): Promise<{
    clients: ClientRecord[];
    page: number;
    limit: number;
    total: number;
  }> {
    if (input.search) {
      return this.findMatchingClients(input.search).then((clients) =>
        this.buildPage(clients, input),
      );
    }
    const [{ total }] = this.database
      .select({ total: sql<number>`count(*)` })
      .from(clients)
      .all();
    const rows = this.database
      .select()
      .from(clients)
      .orderBy(desc(clients.lastModificationMs), desc(clients.id))
      .limit(input.limit)
      .offset((input.page - 1) * input.limit)
      .all();
    return Promise.resolve(
      this.buildPage(
        rows.map((row) => this.toClientRecord(row)),
        input,
        total,
        true,
      ),
    );
  }

  findMatchingClients(search: string): Promise<ClientRecord[]> {
    const searchTerms = searchTokensForSearch(this.protector, search);
    if (searchTerms.length === 0) return Promise.resolve([]);
    const matchingIds = this.database
      .select({ clientId: clientSearchTrigrams.clientId })
      .from(clientSearchTrigrams)
      .where(inArray(clientSearchTrigrams.trigram, searchTerms))
      .groupBy(clientSearchTrigrams.clientId)
      .having(sql`count(*) = ${searchTerms.length}`);
    const candidates = this.database
      .select()
      .from(clients)
      .where(inArray(clients.id, matchingIds))
      .all();
    return Promise.resolve(
      candidates
        .map((row) => this.toClientRecord(row))
        .filter((client) => this.matchesSearch(client, search)),
    );
  }

  private buildPage(
    decryptedRows: ClientRecord[],
    input: {
      page: number;
      limit: number;
    },
    total = decryptedRows.length,
    rowsArePage = false,
  ) {
    const pageRows = rowsArePage
      ? decryptedRows
      : decryptedRows
          .toSorted(
            (left, right) =>
              right.lastModificationMs - left.lastModificationMs ||
              right.id - left.id,
          )
          .slice((input.page - 1) * input.limit, input.page * input.limit);

    return {
      clients: pageRows,
      page: input.page,
      limit: input.limit,
      total,
    };
  }

  private toClientRecord(
    row: typeof clients.$inferSelect,
    fieldProtector?: FieldProtector,
  ): ClientRecord {
    return {
      ...decryptClient(this.protector, row, fieldProtector),
      modifiedByUserId: row.modifiedByUserId,
      lastModificationMs: row.lastModificationMs,
      createdAtMs: row.createdAtMs,
    };
  }

  private matchesSearch(client: ClientRecord, search: string): boolean {
    const normalizedSearch = normalizeClientSearch(search);
    const values = searchableValues(client);
    if (/\s/u.test(search.trim())) {
      values.push(
        `${client.firstname} ${client.lastname}`,
        `${client.lastname} ${client.firstname}`,
      );
    }
    return values.some((value) =>
      normalizeClientSearch(value).includes(normalizedSearch),
    );
  }

  private encryptInput(
    input: CreateClientInput,
    fieldProtector: FieldProtector,
  ) {
    const professional = input.isProfessional === true ? input : undefined;
    return {
      firstname: fieldProtector.encrypt(input.firstname),
      lastname: fieldProtector.encrypt(input.lastname),
      email: fieldProtector.encrypt(input.email?.trim() ?? ""),
      phonenumber: fieldProtector.encrypt(input.phonenumber?.trim() ?? ""),
      address: fieldProtector.encrypt(input.address ?? null),
      addressComplement: fieldProtector.encrypt(
        input.addressComplement?.trim() || null,
      ),
      identityCardNumber: fieldProtector.encrypt(
        input.identityCardNumber?.trim() || null,
      ),
      privatenote: fieldProtector.encrypt(input.privatenote ?? null),
      isProfessional: Boolean(professional),
      siret: fieldProtector.encrypt(professional?.siret?.trim() || null),
      companyName: fieldProtector.encrypt(
        professional?.companyName?.trim() || null,
      ),
    };
  }

  private replaceSearchIndex(
    transaction: Parameters<Parameters<typeof this.database.transaction>[0]>[0],
    clientId: number,
    input: CreateClientInput,
    replaceExisting = true,
  ) {
    if (replaceExisting) {
      transaction
        .delete(clientSearchTrigrams)
        .where(eq(clientSearchTrigrams.clientId, clientId))
        .run();
    }

    const professional = input.isProfessional === true ? input : undefined;
    const searchTerms = searchTokensForValues(
      this.protector,
      searchableValues({
        firstname: input.firstname,
        lastname: input.lastname,
        email: input.email?.trim() ?? "",
        phonenumber: input.phonenumber?.trim() ?? "",
        address: input.address ?? null,
        addressComplement: input.addressComplement ?? null,
        identityCardNumber: input.identityCardNumber ?? null,
        privatenote: input.privatenote ?? null,
        isProfessional: Boolean(professional),
        siret: professional?.siret ?? null,
        companyName: professional?.companyName ?? null,
      }),
    );
    if (searchTerms.length === 0) return;

    transaction
      .insert(clientSearchTrigrams)
      .values(
        searchTerms.map((trigram) => ({
          clientId,
          trigram,
        })),
      )
      .run();
  }
}
