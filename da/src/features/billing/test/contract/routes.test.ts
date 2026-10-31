import { beforeEach, describe, expect, it } from "bun:test";
import { createApp } from "../../../../appFactory";
import { iso8601ToUtcTimestamp } from "../../../../shared/date/iso8601";
import { accessTokenFrom } from "../../../../test-support/authCookies";
import { loadAuthConfig } from "../../../auth/config";
import type {
  IRefreshSessionRepository,
  RefreshSession,
} from "../../../auth/IAuthRepositories";
import type { PasswordHasher } from "../../../auth/password";
import type { User } from "../../../auth/types";
import type {
  BillingDocumentRecord,
  BillingDocumentSnapshot,
  BillingDocumentStatus,
  BillingDocumentType,
  BillingOperationPage,
  BillingOperationRecord,
  BillingPaymentMethod,
  CreateBillingOperationInput,
  IBillingDocumentRepository,
} from "../../IBillingDocumentRepository";
import {
  BILLING_COUNT_STATUSES,
  BILLING_DOCUMENT_TYPES,
  BillingWorkflowConflictError,
  emptyOperationCounts,
  toOperationListItem,
} from "../../IBillingDocumentRepository";

class MemorySessions implements IRefreshSessionRepository {
  async create(_session: RefreshSession): Promise<void> {}
  async findById(_id: string): Promise<RefreshSession | null> {
    return null;
  }
  async revoke(_id: string): Promise<void> {}
  async revokeAllForUser(_userId: number): Promise<void> {}
  async delete(_id: string): Promise<void> {}
  async limitActiveSessions(): Promise<void> {}
}

function setUpdatedAt(user: User, timestamp?: number): void {
  const timestampMs = timestamp ?? Date.now();
  user.updatedAtEpochMs = timestampMs;
}

function setLastLoginAt(user: User, timestamp?: number): void {
  const timestampMs = timestamp ?? Date.now();
  user.lastLoginAtEpochMs = timestampMs;
  setUpdatedAt(user, timestampMs);
}

class MemoryBillingDocuments implements IBillingDocumentRepository {
  readonly documents: BillingDocumentRecord[] = [];
  private nextId = 1;

  private create(input: CreateBillingOperationInput) {
    const { clientId } = input;
    if (clientId !== 42) return null;
    const dateMs = iso8601ToUtcTimestamp(input.date);

    const documentId = this.nextId++;
    const document: BillingDocumentRecord = {
      id: documentId,
      clientId,
      type: input.type,
      date: dateMs,
      comment: input.comment ?? null,
      status: "in_progress",
      serviceStartAt: input.serviceStartAt
        ? iso8601ToUtcTimestamp(input.serviceStartAt)
        : null,
      serviceEndAt: input.serviceEndAt
        ? iso8601ToUtcTimestamp(input.serviceEndAt)
        : null,
      paymentMethod: null,
      paidAt: null,
      lines: (input.lines ?? []).map((line, index) => ({
        id: index + 1,
        billingDocumentId: documentId,
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        vatRate: line.vatRate,
        discount: line.discount ?? "0",
        total: line.total,
      })),
    };
    this.documents.push(document);
    return document;
  }

  async countOperations() {
    const counts = emptyOperationCounts();
    for (const document of this.documents) {
      const type = BILLING_DOCUMENT_TYPES.find(
        (value) => value === document.type,
      );
      const status = BILLING_COUNT_STATUSES.find(
        (value) => value === document.status,
      );
      if (type && status) counts[type][status] += 1;
    }
    return counts;
  }

  async listOperations(input: {
    clientId?: number;
    type?: BillingDocumentType;
    statuses?: BillingDocumentStatus[];
    search?: string;
    page: number;
    limit: number;
  }): Promise<BillingOperationPage> {
    const filtered = this.documents.filter(
      (document) =>
        (!input.clientId || document.clientId === input.clientId) &&
        (!input.type || document.type === input.type) &&
        (!input.statuses?.length ||
          input.statuses.some((status) => status === document.status)) &&
        (!input.search ||
          `${this.asOperation(document).client.firstname} ${this.asOperation(document).client.lastname} ${this.asOperation(document).client.email}`
            .toLowerCase()
            .includes(input.search.toLowerCase())),
    );
    const offset = (input.page - 1) * input.limit;
    return {
      operations: filtered
        .slice(offset, offset + input.limit)
        .map((document) => toOperationListItem(this.asOperation(document))),
      page: input.page,
      limit: input.limit,
      total: filtered.length,
    };
  }

  async getOperation(id: number): Promise<BillingOperationRecord | null> {
    const document = this.documents.find((item) => item.id === id);
    return document ? this.asOperation(document) : null;
  }

  async createOperation(input: CreateBillingOperationInput) {
    const document = this.create(input);
    if (!document) return null;
    if (input.createQuote) {
      if (document.lines.length === 0) {
        throw new BillingWorkflowConflictError(
          "At least one billing line is required before submitting a quote",
        );
      }
      (document as BillingOperationRecord).snapshots = [
        this.createMemorySnapshot(document, "quote", "pending"),
      ];
      document.status = "pending";
      if (
        document.lines.reduce(
          (sum, line) => sum + Math.round(Number(line.total) * 100),
          0,
        ) === 0
      ) {
        return this.acceptQuote(document.id);
      }
    }
    return this.asOperation(document);
  }

  async acceptQuote(id: number) {
    const operation = await this.transition(id, ["pending"], "in_progress");
    const quote = operation?.snapshots.find(({ kind }) => kind === "quote");
    if (quote) {
      quote.status = "accepted";
      quote.updatedAt = Math.max(Date.now(), quote.updatedAt + 1);
    }
    return operation;
  }

  async rejectQuote(id: number) {
    const operation = await this.transition(id, ["pending"], "cancelled");
    const quote = operation?.snapshots.find(({ kind }) => kind === "quote");
    if (quote) {
      quote.status = "rejected";
      quote.updatedAt = Math.max(Date.now(), quote.updatedAt + 1);
    }
    return operation;
  }

  async completeOperation(id: number) {
    const operation = await this.transition(
      id,
      ["in_progress", "completed"],
      "payment_pending",
      "invoice",
    );
    if (
      operation &&
      operation.lines.reduce(
        (sum, line) => sum + Math.round(Number(line.total) * 100),
        0,
      ) === 0
    ) {
      return this.payOperation(id, "free");
    }
    return operation;
  }

  async payOperation(id: number, method: BillingPaymentMethod) {
    const document = this.documents.find((item) => item.id === id);
    if (!document) return null;
    this.assertStatus(document, ["completed", "payment_pending"]);
    const quote = (await this.getOperation(id))?.snapshots.find(
      ({ kind }) => kind === "quote",
    );
    if (quote && quote.status !== "accepted") {
      throw new BillingWorkflowConflictError("An accepted quote is required");
    }
    const existing = document as BillingOperationRecord;
    let invoice = existing.snapshots?.find(({ kind }) => kind === "invoice");
    if (!invoice) {
      invoice = this.createMemorySnapshot(document, "invoice", "unpaid");
      existing.snapshots = [...(existing.snapshots ?? []), invoice];
    }
    invoice.status = "paid";
    invoice.paymentMethod = method;
    invoice.paidAt = Date.now();
    invoice.updatedAt = invoice.paidAt;
    document.status = "paid";
    document.paymentMethod = method;
    document.paidAt = Date.now();
    return this.asOperation(document);
  }

  private async transition(
    id: number,
    allowed: string[],
    next: string,
    snapshot?: "invoice",
  ) {
    const document = this.documents.find((item) => item.id === id);
    if (!document) return null;
    this.assertStatus(document, allowed);
    if (snapshot === "invoice") {
      const quote = (await this.getOperation(id))?.snapshots.find(
        ({ kind }) => kind === "quote",
      );
      if (quote && quote.status !== "accepted") {
        throw new BillingWorkflowConflictError(
          "An accepted quote is required before invoicing",
        );
      }
      const snapshots = (document as BillingOperationRecord).snapshots ?? [];
      if (!snapshots.some(({ kind }) => kind === "invoice")) {
        (document as BillingOperationRecord).snapshots = [
          ...snapshots,
          this.createMemorySnapshot(document, "invoice", "unpaid"),
        ];
      }
    }
    document.status = next;
    return this.asOperation(document);
  }

  private assertStatus(document: BillingDocumentRecord, allowed: string[]) {
    if (!allowed.includes(document.status)) {
      throw new BillingWorkflowConflictError("Invalid billing transition");
    }
  }

  private asOperation(document: BillingDocumentRecord): BillingOperationRecord {
    const snapshots =
      (document as BillingOperationRecord).snapshots ??
      ([] as BillingDocumentSnapshot[]);
    return {
      ...document,
      client: {
        id: document.clientId,
        firstname: "Client",
        lastname: String(document.clientId),
        email: "client@example.com",
        phonenumber: "+33123456789",
        address: null,
        addressComplement: null,
        isProfessional: false,
        companyName: null,
        siret: null,
      },
      snapshots,
    };
  }

  private createMemorySnapshot(
    document: BillingDocumentRecord,
    kind: "quote" | "invoice",
    status: string,
  ): BillingDocumentSnapshot {
    const timestamp = Date.now();
    return {
      kind,
      status,
      createdAt: timestamp,
      updatedAt: timestamp,
      payload: {
        documentNumber: `${kind === "quote" ? "DEV" : "FAC"}${document.id}`,
        documentKind: kind,
        ...(kind === "quote"
          ? { validUntil: timestamp + 30 * 24 * 60 * 60 * 1000 }
          : {}),
        lines: document.lines,
      },
      ...(kind === "invoice" ? { paymentMethod: null, paidAt: null } : {}),
    };
  }
}

const config = loadAuthConfig({
  JWT_SECRET: "b".repeat(32),
  SPA_APP_ID: "billing-spa",
  BCRYPT_ROUNDS: "4",
});
const passwords: PasswordHasher = {
  hash: async (password) => `hashed:${password}`,
  compare: async (password, hash) => hash === `hashed:${password}`,
};
const admin: User = {
  id: 1,
  email: "billing-admin@example.com",
  firstname: "Billing",
  lastname: "Admin",
  passwordHash: await passwords.hash("password"),
  role: "Admin",
  isActive: true,
  mustChangePassword: false,
  lastLoginAtEpochMs: null,
  createdAtEpochMs: Date.UTC(2026, 0, 1),
  updatedAtEpochMs: Date.UTC(2026, 0, 1),
};
const regularUser: User = {
  ...admin,
  id: 2,
  email: "billing-user@example.com",
  role: "Subadmin",
};
const billingDocuments = new MemoryBillingDocuments();
const app = createApp(config, {
  users: {
    async findByEmail(email) {
      return [admin, regularUser].find((user) => user.email === email) ?? null;
    },
    async findById(id) {
      return [admin, regularUser].find((user) => user.id === id) ?? null;
    },
    async create(createdUser) {
      return { ...createdUser, id: 3 };
    },
    async updatePassword(id, passwordHash, timestamp) {
      const user = [admin, regularUser].find(
        (candidate) => candidate.id === id,
      );
      if (user) {
        user.passwordHash = passwordHash;
        user.mustChangePassword = false;
        setUpdatedAt(user, timestamp);
      }
    },
    async setRole(id, role, timestamp) {
      const user = [admin, regularUser].find(
        (candidate) => candidate.id === id,
      );
      if (user) {
        user.role = role;
        setUpdatedAt(user, timestamp);
      }
    },
    async setActive(id, isActive, timestamp) {
      const user = [admin, regularUser].find(
        (candidate) => candidate.id === id,
      );
      if (user) {
        user.isActive = isActive;
        setUpdatedAt(user, timestamp);
      }
    },
    async list(activeOnly = true) {
      return [admin, regularUser]
        .filter((candidate) => !activeOnly || candidate.isActive)
        .map(({ passwordHash: _hash, ...user }) => user);
    },
    async recordLogin(id, timestamp) {
      const user = [admin, regularUser].find(
        (candidate) => candidate.id === id,
      );
      if (user) {
        setLastLoginAt(user, timestamp);
      }
    },
    async recordLogout(id, timestamp) {
      const user = [admin, regularUser].find(
        (candidate) => candidate.id === id,
      );
      if (user) {
        setUpdatedAt(user, timestamp);
      }
    },
  },
  sessions: new MemorySessions(),
  passwords,
  billingDocuments,
});

const baseHeaders = {
  "X-App-Id": "billing-spa",
  "Content-Type": "application/json",
};

async function accessToken(email: string): Promise<string> {
  const response = await app.handle(
    new Request("http://localhost/auth/login", {
      method: "POST",
      headers: baseHeaders,
      body: JSON.stringify({ email, password: "password" }),
    }),
  );
  return accessTokenFrom(response);
}

beforeEach(() => {
  billingDocuments.documents.length = 0;
});

describe("billing document HTTP contract", () => {
  const input = {
    clientId: 42,
    type: "repair",
    date: "2026-10-05T12:00:00Z",
    lines: [
      {
        description: "Service",
        quantity: "1",
        unitPrice: "10",
        vatRate: "0",
        total: "10",
      },
    ],
  };
  const request = (
    path: string,
    headers: HeadersInit,
    method = "GET",
    body?: unknown,
  ) =>
    app.handle(
      new Request(`http://localhost${path}`, {
        method,
        headers,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
    );

  const authenticatedRoutes: [string, string, unknown][] = [
    ["GET", "/operations", undefined],
    ["GET", "/operations/counts", undefined],
    ["GET", "/operations/1", undefined],
    ["POST", "/operations", input],
    ...["accept", "reject", "complete", "pay"].map(
      (action): [string, string, unknown] => [
        "POST",
        `/operations/1/${action}`,
        action === "pay" ? { method: "cash" } : undefined,
      ],
    ),
  ];
  it.each(authenticatedRoutes)(
    "requires authentication for %s %s",
    async (method, path, body) => {
      const response = await request(path, baseHeaders, method, body);
      expect(response.status).toBe(401);
      expect(await response.json()).toMatchObject({
        code: "UNAUTHORIZED",
        message: "Not authenticated",
      });
    },
  );

  it.each(["", "access_token=invalid"])(
    "rejects missing or invalid access tokens on counts (%s)",
    async (cookie) => {
      const response = await request("/operations/counts", {
        ...baseHeaders,
        Cookie: cookie,
      });
      expect(response.status).toBe(401);
      expect((await response.json()).code).toBe(
        cookie ? "INVALID_AUTH_TOKEN" : "UNAUTHORIZED",
      );
    },
  );

  it.each([
    "page=0",
    "limit=0",
    "limit=51",
    "clientId=0",
    "type=unknown",
    "status=unknown",
    "status=pending,unknown",
    "search=",
    `search=${"x".repeat(101)}`,
  ])("rejects invalid list query %s", async (query) => {
    const response = await request(`/operations?${query}`, {
      ...baseHeaders,
      Cookie: `access_token=${await accessToken(admin.email)}`,
    });
    expect(response.status).toBe(400);
    expect(billingDocuments.documents).toHaveLength(0);
  });

  it.each([
    { clientId: 0 },
    { type: "unknown" },
    { date: "2026-10-05T12:00:00" },
    { createQuote: "true" },
    { lines: [{ ...input.lines[0], description: "" }] },
    { lines: [{ ...input.lines[0], quantity: "-1" }] },
    { lines: [{ ...input.lines[0], unitPrice: "10.001" }] },
    { lines: Array.from({ length: 101 }, () => input.lines[0]) },
  ])("rejects invalid creation fields %p", async (fields) => {
    const response = await request(
      "/operations",
      {
        ...baseHeaders,
        Cookie: `access_token=${await accessToken(admin.email)}`,
      },
      "POST",
      { ...input, ...fields },
    );
    expect(response.status).toBe(400);
    expect(billingDocuments.documents).toHaveLength(0);
  });

  it.each([
    [{ createQuote: true, lines: [] }, "INVALID_QUOTE"],
    [{ serviceStartAt: "2026-10-06T00:00:00Z" }, "INVALID_SERVICE_PERIOD"],
    [{ type: "rental" }, "INVALID_SERVICE_PERIOD"],
  ] as const)(
    "returns the documented creation error for %p",
    async (fields, code) => {
      const response = await request(
        "/operations",
        {
          ...baseHeaders,
          Cookie: `access_token=${await accessToken(admin.email)}`,
        },
        "POST",
        { ...input, ...fields },
      );
      expect(response.status).toBe(400);
      expect((await response.json()).code).toBe(code);
      expect(billingDocuments.documents).toHaveLength(0);
    },
  );

  it.each(["accept", "reject", "complete", "pay"])(
    "returns the documented missing-operation error for %s",
    async (action) => {
      const response = await request(
        `/operations/999/${action}`,
        {
          ...baseHeaders,
          Cookie: `access_token=${await accessToken(admin.email)}`,
        },
        "POST",
        action === "pay" ? { method: "cash" } : undefined,
      );
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({
        code: "OPERATION_NOT_FOUND",
        message: "Operation not found",
      });
    },
  );

  it("returns documented missing client and detail errors", async () => {
    const headers = {
      ...baseHeaders,
      Cookie: `access_token=${await accessToken(admin.email)}`,
    };
    for (const [path, method, body, code] of [
      ["/operations/999", "GET", undefined, "OPERATION_NOT_FOUND"],
      ["/operations", "POST", { ...input, clientId: 999 }, "CLIENT_NOT_FOUND"],
    ] as const) {
      const response = await request(path, headers, method, body);
      expect(response.status).toBe(404);
      expect((await response.json()).code).toBe(code);
    }
  });

  it("validates payment methods before calling the repository", async () => {
    const headers = {
      ...baseHeaders,
      Cookie: `access_token=${await accessToken(admin.email)}`,
    };
    const created = await request("/operations", headers, "POST", input);
    const id = (await created.json()).id;
    const response = await request(`/operations/${id}/pay`, headers, "POST", {
      method: "bitcoin",
    });
    expect(response.status).toBe(400);
    expect((await billingDocuments.getOperation(id))?.status).toBe(
      "in_progress",
    );
  });

  it.each(BILLING_DOCUMENT_TYPES)(
    "exposes the quote workflow for %s to subadmins",
    async (type) => {
      const headers = {
        ...baseHeaders,
        Cookie: `access_token=${await accessToken(regularUser.email)}`,
      };
      const created = await request("/operations", headers, "POST", {
        ...input,
        type,
        createQuote: true,
        ...(type === "rental"
          ? {
              serviceStartAt: "2026-10-06T00:00:00Z",
              serviceEndAt: "2026-10-08T00:00:00Z",
            }
          : {}),
      });
      expect(created.status).toBe(201);
      const id = (await created.json()).id;
      const invalid = await request(
        `/operations/${id}/complete`,
        headers,
        "POST",
      );
      expect(invalid.status).toBe(409);
      expect((await invalid.json()).code).toBe("INVALID_OPERATION_TRANSITION");
      for (const [action, status] of [
        ["accept", "in_progress"],
        ["complete", "payment_pending"],
        ["pay", "paid"],
      ] as const) {
        const response = await request(
          `/operations/${id}/${action}`,
          headers,
          "POST",
          action === "pay" ? { method: "cash" } : undefined,
        );
        expect(response.status).toBe(200);
        expect((await response.json()).status).toBe(status);
      }
      const counts = await request("/operations/counts", headers);
      expect(counts.status).toBe(200);
      expect(await counts.json()).toEqual(emptyOperationCounts());
    },
  );

  it.each([
    ["PUT", "/operations/1", input],
    ["POST", "/operations/1/submit", undefined],
    ["POST", "/operations/1/start", undefined],
    ["POST", "/operations/1/invoice", undefined],
    ["GET", "/clients/42/documents", undefined],
    ["POST", "/clients/42/documents", input],
    ["GET", "/repairs/", undefined],
  ] as [string, string, unknown][])(
    "no longer exposes the legacy %s %s route",
    async (method, path, body) => {
      const headers = {
        ...baseHeaders,
        Cookie: `access_token=${await accessToken(admin.email)}`,
      };
      expect((await request(path, headers, method, body)).status).toBe(404);
      expect(billingDocuments.documents).toHaveLength(0);
    },
  );

  it("enforces the quote-to-payment workflow and creates invoice snapshots", async () => {
    const token = await accessToken(admin.email);
    const headers = { ...baseHeaders, Cookie: `access_token=${token}` };
    const invalidRental = await app.handle(
      new Request("http://localhost/operations", {
        method: "POST",
        headers,
        body: JSON.stringify({
          clientId: 42,
          type: "rental",
          date: "2026-10-05T12:00:00Z",
          lines: [],
        }),
      }),
    );
    expect(invalidRental.status).toBe(400);

    const created = await app.handle(
      new Request("http://localhost/operations", {
        method: "POST",
        headers,
        body: JSON.stringify({
          clientId: 42,
          type: "rental",
          createQuote: true,
          date: "2026-10-05T12:00:00Z",
          serviceStartAt: "2026-10-06T00:00:00Z",
          serviceEndAt: "2026-10-08T23:59:59Z",
          lines: [
            {
              description: "Location vélo",
              quantity: "2",
              unitPrice: "10.00",
              vatRate: "20.00",
              total: "24.00",
            },
          ],
        }),
      }),
    );
    expect(created.status).toBe(201);
    const createdOperation = await created.json();
    const id = createdOperation.id as number;
    expect(createdOperation.status).toBe("pending");
    expect(createdOperation.serviceStartAt).toBe(
      iso8601ToUtcTimestamp("2026-10-06T00:00:00Z"),
    );

    const completeBeforeAccept = await app.handle(
      new Request(`http://localhost/operations/${id}/complete`, {
        method: "POST",
        headers,
      }),
    );
    expect(completeBeforeAccept.status).toBe(409);

    for (const [action, expectedStatus] of [
      ["accept", "in_progress"],
      ["complete", "payment_pending"],
      ["pay", "paid"],
    ] as const) {
      const response = await app.handle(
        new Request(`http://localhost/operations/${id}/${action}`, {
          method: "POST",
          headers,
          ...(action === "pay"
            ? { body: JSON.stringify({ method: "bank_transfer" }) }
            : {}),
        }),
      );
      expect(response.status).toBe(200);
      const operation = await response.json();
      expect(operation.status).toBe(expectedStatus);
      if (action === "pay") {
        expect(operation).not.toHaveProperty("paymentStatus");
        expect(operation.paymentMethod).toBe("bank_transfer");
        expect(
          operation.snapshots.find(
            (snapshot: { kind: string }) => snapshot.kind === "invoice",
          )?.status,
        ).toBe("paid");
      }
    }

    const createdSecond = await app.handle(
      new Request("http://localhost/operations", {
        method: "POST",
        headers,
        body: JSON.stringify({
          clientId: 42,
          type: "repair",
          date: "2026-10-09T12:00:00Z",
          lines: [
            {
              description: "Révision",
              quantity: "1",
              unitPrice: "50.00",
              vatRate: "20.00",
              total: "60.00",
            },
          ],
        }),
      }),
    );
    const secondId = (await createdSecond.json()).id as number;
    for (const action of ["complete"] as const) {
      const response = await app.handle(
        new Request(`http://localhost/operations/${secondId}/${action}`, {
          method: "POST",
          headers,
        }),
      );
      expect(response.status).toBe(200);
    }
    const directPayment = await app.handle(
      new Request(`http://localhost/operations/${secondId}/pay`, {
        method: "POST",
        headers,
        body: JSON.stringify({ method: "cash" }),
      }),
    );
    expect(directPayment.status).toBe(200);
    const paidWithoutSeparateInvoice = await directPayment.json();
    expect(paidWithoutSeparateInvoice.status).toBe("paid");
    expect(
      paidWithoutSeparateInvoice.snapshots.some(
        (snapshot: { kind: string }) => snapshot.kind === "invoice",
      ),
    ).toBe(true);
  });
});
