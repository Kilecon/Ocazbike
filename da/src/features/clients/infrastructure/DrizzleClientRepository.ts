import { desc, eq, inArray, sql } from "drizzle-orm";
import type { db } from "../../../shared/database/db";
import {
  clientSearchTrigrams,
  clients,
} from "../../../shared/database/schema/billing";
import {
  type ClientDataProtector,
  normalizeClientSearch,
} from "../crypto/ClientDataProtector";
import type {
  ClientRecord,
  CreateClientInput,
  IClientRepository,
} from "../IClientRepository";

export class DrizzleClientRepository implements IClientRepository {
  constructor(
    private readonly database: typeof db,
    private readonly protector: ClientDataProtector,
  ) {}

  async create(input: CreateClientInput, actorUserId: number) {
    const salt = this.protector.createSalt();
    const fieldProtector = this.protector.createFieldProtector(salt);
    const timestampMs = Date.now();

    return this.database.transaction((transaction) => {
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
    });
  }

  async update(id: number, input: CreateClientInput, actorUserId: number) {
    return this.database.transaction((transaction) => {
      const existing = transaction
        .select()
        .from(clients)
        .where(eq(clients.id, id))
        .get();
      if (!existing) return null;

      const salt = Buffer.from(existing.encryptionSalt ?? "", "base64url");
      const fieldProtector = this.protector.createFieldProtector(salt);
      this.protector.decryptClient(existing, fieldProtector);
      const timestampMs = Math.max(Date.now(), existing.lastModificationMs + 1);
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
    });
  }

  async getById(id: number): Promise<ClientRecord | null> {
    const row = await this.database
      .select()
      .from(clients)
      .where(eq(clients.id, id))
      .get();
    return row ? this.toClientRecord(row) : null;
  }

  async listPage(input: { page: number; limit: number; search?: string }) {
    const normalizedSearch = input.search
      ? normalizeClientSearch(input.search)
      : "";
    if (input.search && !normalizedSearch) {
      return {
        clients: [],
        page: input.page,
        limit: input.limit,
        total: 0,
      };
    }
    const searchTerms = normalizedSearch
      ? this.protector.searchTokensForSearch(input.search ?? "")
      : [];
    if (searchTerms.length > 0) {
      const matchingIds = this.database
        .select({ clientId: clientSearchTrigrams.clientId })
        .from(clientSearchTrigrams)
        .where(inArray(clientSearchTrigrams.trigram, searchTerms))
        .groupBy(clientSearchTrigrams.clientId)
        .having(sql`count(*) = ${searchTerms.length}`);

      const candidates = await this.database
        .select()
        .from(clients)
        .where(inArray(clients.id, matchingIds));
      return this.buildPage(
        candidates
          .map((row) => this.toClientRecord(row))
          .filter((client) => this.matchesSearch(client, normalizedSearch)),
        input,
      );
    }

    const [{ total }] = await this.database
      .select({ total: sql<number>`count(*)` })
      .from(clients);
    const rows = await this.database
      .select()
      .from(clients)
      .orderBy(desc(clients.lastModificationMs), desc(clients.id))
      .limit(input.limit)
      .offset((input.page - 1) * input.limit);
    return this.buildPage(
      rows.map((row) => this.toClientRecord(row)),
      input,
      total,
      true,
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
          .sort(
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
    fieldProtector?: ReturnType<ClientDataProtector["createFieldProtector"]>,
  ): ClientRecord {
    return {
      ...this.protector.decryptClient(row, fieldProtector),
      modifiedByUserId: row.modifiedByUserId,
      lastModificationMs: row.lastModificationMs,
      createdAtMs: row.createdAtMs,
    };
  }

  private matchesSearch(
    client: ClientRecord,
    normalizedSearch: string,
  ): boolean {
    return this.protector
      .searchableValues({
        ...client,
        address: client.address,
        addressComplement: client.addressComplement,
        privatenote: client.privatenote,
      })
      .some((value) => normalizeClientSearch(value).includes(normalizedSearch));
  }

  private encryptInput(
    input: CreateClientInput,
    fieldProtector: ReturnType<ClientDataProtector["createFieldProtector"]>,
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
    const searchTerms = this.protector.searchTokensForValues(
      this.protector.searchableValues({
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
