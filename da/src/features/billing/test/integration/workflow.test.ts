import { describe, expect, it } from "bun:test";
import { DataProtector } from "../../../../shared/crypto/DataProtector";
import { accessTokenFrom } from "../../../../test-support/authCookies";
import type { BillingOperationRecord } from "../../IBillingDocumentRepository";
import { BillingOperationInputError } from "../../IBillingDocumentRepository";
import { DrizzleBillingDocumentRepository } from "../../infrastructure/DrizzleBillingDocumentRepository";
import { createBillingIntegrationFixture as createClientIntegrationFixture } from "./helpers";

describe("billing operation persistence", () => {
  it("returns all client operation statuses by type with descending date pagination", async () => {
    const fixture = createClientIntegrationFixture("billing-client-grids");
    try {
      await fixture.reset();
      const client = await fixture.clients.create(
        { firstname: "Ada", lastname: "Lovelace", email: "ada@example.com" },
        fixture.admin.id,
      );
      const other = await fixture.clients.create(
        { firstname: "Ada", lastname: "Lovelace", email: "other@example.com" },
        fixture.admin.id,
      );
      const headers = {
        Cookie: `access_token=${accessTokenFrom(await fixture.login())}`,
      };
      for (const type of ["repair", "sale", "purchase", "rental"]) {
        for (let i = 0; i < 52; i += 1) {
          for (const clientId of [client.id, other.id]) {
            fixture.database.sqlite
              .query(
                "INSERT INTO billing_documents (client_id, type, date_ms, status) VALUES (?, ?, ?, ?)",
              )
              .run(clientId, type, 1000 + i, i % 2 ? "paid" : "cancelled");
          }
        }
        const first = await fixture.request(
          `/operations?clientId=${client.id}&type=${type}&page=1&limit=50`,
          { headers },
        );
        expect(first.status).toBe(200);
        const firstPage = await first.json();
        expect(firstPage.total).toBe(52);
        expect(firstPage.operations).toHaveLength(50);
        expect(
          firstPage.operations.map((item: { date: number }) => item.date),
        ).toEqual(Array.from({ length: 50 }, (_, i) => 1051 - i));
        expect(
          firstPage.operations.every(
            (item: { clientId: number; type: string }) =>
              item.clientId === client.id && item.type === type,
          ),
        ).toBe(true);
        const second = await fixture.request(
          `/operations?clientId=${client.id}&type=${type}&page=2&limit=50`,
          { headers },
        );
        expect(
          (await second.json()).operations.map(
            (item: { date: number }) => item.date,
          ),
        ).toEqual([1001, 1000]);
        for (const status of ["pending", "in_progress"]) {
          fixture.database.sqlite
            .query(
              "INSERT INTO billing_documents (client_id, type, date_ms, status) VALUES (?, ?, ?, ?)",
            )
            .run(client.id, type, 2000, status);
        }
        const tied = await fixture.request(
          `/operations?clientId=${client.id}&type=${type}&limit=2`,
          { headers },
        );
        const tiedPage = await tied.json();
        expect(
          tiedPage.operations.map((item: { date: number }) => item.date),
        ).toEqual([2000, 2000]);
        expect(tiedPage.operations[0].id).toBeGreaterThan(
          tiedPage.operations[1].id,
        );
      }
      const empty = await fixture.request(
        "/operations?clientId=999999&type=repair",
        { headers },
      );
      expect(await empty.json()).toMatchObject({ total: 0, operations: [] });
      const invalid = await fixture.request(
        "/operations?clientId=0&type=repair",
        { headers },
      );
      expect(invalid.status).toBe(400);
    } finally {
      fixture.cleanup();
    }
  });
  it.each(["repair", "sale", "purchase", "rental"] as const)(
    "filters %s statuses and encrypted client full names before pagination",
    async (type) => {
      const fixture = createClientIntegrationFixture(`billing-${type}-filters`);
      try {
        await fixture.reset();
        const client = await fixture.clients.create(
          {
            firstname: "Élodie",
            lastname: "Martin",
            email: "elodie@example.com",
          },
          fixture.admin.id,
        );
        const other = await fixture.clients.create(
          { firstname: "Ada", lastname: "Lovelace", email: "ada@example.com" },
          fixture.admin.id,
        );
        const headers = {
          Cookie: `access_token=${accessTokenFrom(await fixture.login())}`,
        };
        for (const status of [
          "pending",
          "in_progress",
          "payment_pending",
          "paid",
          "cancelled",
        ]) {
          for (const id of [client.id, other.id]) {
            fixture.database.sqlite
              .query(
                "INSERT INTO billing_documents (client_id, type, date_ms, status) VALUES (?, ?, ?, ?)",
              )
              .run(id, type, Date.now(), status);
          }
        }
        for (const search of [
          "Elodie Martin",
          "Martin Élodie",
          "elodie@example.com",
        ]) {
          const params = new URLSearchParams({
            type,
            status: "pending,in_progress,payment_pending",
            search,
            page: "2",
            limit: "1",
          });
          const response = await fixture.request(`/operations?${params}`, {
            headers,
          });
          expect(response.status).toBe(200);
          const page = await response.json();
          expect(page).toMatchObject({ total: 3, page: 2, limit: 1 });
          expect(page.operations).toHaveLength(1);
          expect(page.operations[0].client.lastname).toBe("Martin");
          expect(["pending", "in_progress", "payment_pending"]).toContain(
            page.operations[0].status,
          );
        }
        const single = await fixture.request(
          `/operations?type=${type}&status=paid&search=Elodie`,
          { headers },
        );
        expect(await single.json()).toMatchObject({
          total: 1,
          operations: [{ status: "paid" }],
        });
        const all = await fixture.request(
          `/operations?type=${type}&search=Elodie`,
          { headers },
        );
        expect((await all.json()).total).toBe(5);
        const missing = await fixture.request(
          `/operations?type=${type}&search=Nobody`,
          { headers },
        );
        expect(await missing.json()).toMatchObject({
          total: 0,
          operations: [],
        });
        const invalid = await fixture.request(
          `/operations?type=${type}&status=pending,invalid`,
          { headers },
        );
        expect(invalid.status).toBe(400);
      } finally {
        fixture.cleanup();
      }
    },
  );
  it("counts all active statuses by type without pagination or decrypted documents", async () => {
    const fixture = createClientIntegrationFixture("billing-counts");
    try {
      await fixture.reset();
      expect((await fixture.request("/operations/counts")).status).toBe(401);
      const headers = {
        Cookie: `access_token=${accessTokenFrom(await fixture.login())}`,
      };
      const empty = {
        repair: { pending: 0, in_progress: 0, payment_pending: 0 },
        sale: { pending: 0, in_progress: 0, payment_pending: 0 },
        purchase: { pending: 0, in_progress: 0, payment_pending: 0 },
        rental: { pending: 0, in_progress: 0, payment_pending: 0 },
      };
      expect(
        await (await fixture.request("/operations/counts", { headers })).json(),
      ).toEqual(empty);
      const client = await fixture.clients.create(
        { firstname: "Ada", lastname: "Lovelace", email: "ada@example.com" },
        fixture.admin.id,
      );
      for (const type of ["repair", "sale", "purchase", "rental"]) {
        for (const status of [
          "pending",
          "in_progress",
          "payment_pending",
          "paid",
          "cancelled",
          "created",
          "accepted",
          "completed",
        ]) {
          const copies =
            status === "pending" ? 51 : status === "in_progress" ? 2 : 1;
          for (let i = 0; i < copies; i += 1) {
            fixture.database.sqlite
              .query(
                "INSERT INTO billing_documents (client_id, type, date_ms, status) VALUES (?, ?, ?, ?)",
              )
              .run(client.id, type, Date.now(), status);
          }
        }
      }
      const response = await fixture.request("/operations/counts", { headers });
      expect(response.status).toBe(200);
      const counts = await response.json();
      for (const type of ["repair", "sale", "purchase", "rental"]) {
        expect(counts[type]).toEqual({
          pending: 51,
          in_progress: 2,
          payment_pending: 1,
        });
      }
      fixture.database.sqlite
        .query(
          "UPDATE billing_documents SET status = 'paid' WHERE type = 'sale' AND status = 'payment_pending'",
        )
        .run();
      expect(
        (
          await (
            await fixture.request("/operations/counts", { headers })
          ).json()
        ).sale.payment_pending,
      ).toBe(0);
    } finally {
      fixture.cleanup();
    }
  });
  it.each(["repair", "sale", "purchase", "rental"] as const)(
    "persists manually entered %s service dates ahead of automatic dates",
    async (type) => {
      const fixture = createClientIntegrationFixture(
        `billing-${type}-service-dates`,
      );
      try {
        await fixture.reset();
        const client = await fixture.clients.create(
          { firstname: "Ada", lastname: "Lovelace", email: "ada@example.com" },
          fixture.admin.id,
        );
        const headers = {
          Cookie: `access_token=${accessTokenFrom(await fixture.login())}`,
        };
        const dates = {
          serviceStartAt: "2026-11-02T00:00:00+01:00",
          serviceEndAt: "2026-11-08T23:59:59+01:00",
        };
        const savedDates = {
          serviceStartAt: Date.parse(dates.serviceStartAt),
          serviceEndAt: Date.parse(dates.serviceEndAt),
        };
        const response = await fixture.request("/operations", {
          method: "POST",
          headers,
          body: JSON.stringify({
            clientId: client.id,
            type,
            createQuote: true,
            date: "2026-10-31T12:00:00Z",
            ...dates,
            lines: [
              {
                description: "Prestation",
                quantity: "1",
                unitPrice: "10",
                vatRate: "0",
                total: "10",
              },
            ],
          }),
        });
        expect(response.status).toBe(201);
        const operation = await response.json();
        expect(operation).toMatchObject(savedDates);
        expect(operation.snapshots[0].payload).toMatchObject(savedDates);
        const detail = await fixture.request(`/operations/${operation.id}`, {
          headers,
        });
        expect(await detail.json()).toMatchObject(savedDates);
        const rejected = await fixture.request(
          `/operations/${operation.id}/reject`,
          { method: "POST", headers },
        );
        expect(rejected.status).toBe(200);
        const cancelled = await rejected.json();
        const listed = await fixture.request(
          `/operations?type=${type}&page=1&limit=10`,
          { headers },
        );
        const item = (await listed.json()).operations[0];
        expect(item).toMatchObject(savedDates);
        expect(item.closedAt).toBe(cancelled.snapshots[0].updatedAt);
        expect(Number.isSafeInteger(item.serviceStartAt)).toBe(true);
        expect(Number.isSafeInteger(item.serviceEndAt)).toBe(true);
      } finally {
        fixture.cleanup();
      }
    },
  );
  it.each(["repair", "sale", "purchase", "rental"] as const)(
    "rolls back %s completion when automatic invoice creation fails",
    async (type) => {
      const fixture = createClientIntegrationFixture(
        "billing-nonzero-complete-rollback",
      );
      try {
        await fixture.reset();
        const client = await fixture.clients.create(
          { firstname: "Ada", lastname: "Lovelace", email: "ada@example.com" },
          fixture.admin.id,
        );
        const repository = new DrizzleBillingDocumentRepository(
          fixture.database.database,
          new DataProtector(Buffer.alloc(32, 31)),
          fixture.clients,
        );
        const login = await fixture.login();
        const headers = { Cookie: `access_token=${accessTokenFrom(login)}` };
        for (const createQuote of [true, false]) {
          const operation = await repository.createOperation({
            clientId: client.id,
            type,
            createQuote,
            date: "2026-10-31T12:00:00Z",
            ...(type === "rental" && {
              serviceStartAt: "2026-11-01T00:00:00Z",
              serviceEndAt: "2026-11-03T23:59:59Z",
            }),
            lines: [
              {
                description: "Révision",
                quantity: "1",
                unitPrice: "50",
                vatRate: "20",
                total: "60",
              },
            ],
          });
          if (!operation) throw new Error("Operation was not created");
          if (createQuote) await repository.acceptQuote(operation.id);
          const before = await repository.getOperation(operation.id);
          fixture.database.sqlite.run(
            "CREATE TRIGGER fail_nonzero_invoice BEFORE INSERT ON billing_invoices BEGIN SELECT RAISE(ABORT, 'Invoice creation failed'); END;",
          );
          await expect(
            repository.completeOperation(operation.id),
          ).rejects.toThrow("Invoice creation failed");
          expect(await repository.getOperation(operation.id)).toEqual(before);
          fixture.database.sqlite.run("DROP TRIGGER fail_nonzero_invoice");
          const response = await fixture.request(
            `/operations/${operation.id}/complete`,
            { method: "POST", headers },
          );
          expect(response.status).toBe(200);
          const completed = await response.json();
          expect(completed).toMatchObject({
            status: "payment_pending",
            paymentMethod: null,
            paidAt: null,
          });
          const invoice = completed.snapshots.find(
            (snapshot: { kind: string }) => snapshot.kind === "invoice",
          );
          expect(invoice).toMatchObject({
            status: "unpaid",
            paymentMethod: null,
            paidAt: null,
          });
          expect(invoice.payload.lines[0].total).toBe("60");
          expect(await repository.getOperation(operation.id)).toEqual(
            completed,
          );
          const duplicate = await fixture.request(
            `/operations/${operation.id}/complete`,
            { method: "POST", headers },
          );
          expect(duplicate.status).toBe(409);
          expect(await repository.getOperation(operation.id)).toEqual(
            completed,
          );
        }
      } finally {
        fixture.cleanup();
      }
    },
  );

  it.each(["sale", "purchase", "rental"] as const)(
    "uses the repair workflow for %s quotes, discounts, invoices and list dates",
    async (type) => {
      const fixture = createClientIntegrationFixture(
        `billing-${type}-workflow`,
      );
      try {
        await fixture.reset();
        const client = await fixture.clients.create(
          { firstname: "Ada", lastname: "Lovelace", email: "ada@example.com" },
          fixture.admin.id,
        );
        const login = await fixture.login();
        const headers = { Cookie: `access_token=${accessTokenFrom(login)}` };
        const call = (id: number, action: string, body?: object) =>
          fixture.request(`/operations/${id}/${action}`, {
            method: "POST",
            headers,
            ...(body ? { body: JSON.stringify(body) } : {}),
          });
        for (const createQuote of [true, false]) {
          for (const total of ["0.00", "0.01"]) {
            const created = await fixture.request("/operations", {
              method: "POST",
              headers,
              body: JSON.stringify({
                clientId: client.id,
                type,
                createQuote,
                date: "2026-10-01T12:00:00Z",
                ...(type === "rental" && {
                  serviceStartAt: "2026-10-02T00:00:00Z",
                  serviceEndAt: "2026-10-08T23:59:59Z",
                }),
                lines: [
                  {
                    description: "Vélo",
                    quantity: "1",
                    unitPrice: "10.00",
                    vatRate: "0",
                    total: "10.00",
                  },
                  {
                    description: "Remise",
                    quantity: "1",
                    unitPrice: total === "0.00" ? "-10.00" : "-9.99",
                    vatRate: "0",
                    total: total === "0.00" ? "-10.00" : "-9.99",
                  },
                ],
              }),
            });
            expect(created.status).toBe(201);
            const operation = await created.json();
            const zero = total === "0.00";
            expect(operation.status).toBe(
              createQuote && !zero ? "pending" : "in_progress",
            );
            expect(operation.snapshots).toHaveLength(createQuote ? 1 : 0);
            if (createQuote) {
              expect(operation.snapshots[0].status).toBe(
                zero ? "accepted" : "pending",
              );
              expect(operation.snapshots[0].payload.validUntil).toBe(
                operation.snapshots[0].createdAt + 30 * 86400000,
              );
              if (!zero) {
                const accepted = await call(operation.id, "accept");
                expect(accepted.status).toBe(200);
                const acceptedOperation = await accepted.json();
                expect(acceptedOperation.status).toBe("in_progress");
                expect(acceptedOperation.snapshots[0].payload).toEqual(
                  operation.snapshots[0].payload,
                );
              }
            }
            const completed = await call(operation.id, "complete");
            expect(completed.status).toBe(200);
            const invoiced = await completed.json();
            if (type === "rental") {
              expect(invoiced.serviceStartAt).toBe(
                Date.parse("2026-10-02T00:00:00Z"),
              );
              expect(invoiced.serviceEndAt).toBe(
                Date.parse("2026-10-08T23:59:59Z"),
              );
            }
            expect(invoiced.status).toBe(zero ? "paid" : "payment_pending");
            const invoice = invoiced.snapshots.find(
              (snapshot: { kind: string }) => snapshot.kind === "invoice",
            );
            if (type === "rental") {
              expect(invoice.payload).toMatchObject({
                type: "rental",
                serviceStartAt: Date.parse("2026-10-02T00:00:00Z"),
                serviceEndAt: Date.parse("2026-10-08T23:59:59Z"),
              });
            }
            expect(invoice).toMatchObject({
              status: zero ? "paid" : "unpaid",
              paymentMethod: zero ? "free" : null,
            });
            expect(invoice.payload.lines).toHaveLength(2);
            if (!zero) {
              const paid = await call(operation.id, "pay", { method: "cash" });
              expect(paid.status).toBe(200);
              const paidOperation = await paid.json();
              expect(paidOperation.status).toBe("paid");
              expect(
                paidOperation.snapshots.find(
                  (snapshot: { kind: string }) => snapshot.kind === "invoice",
                ).payload,
              ).toEqual(invoice.payload);
            }
            const listed = await fixture.request(
              `/operations?type=${type}&page=1&limit=10`,
              { headers },
            );
            const summary = (await listed.json()).operations.find(
              (item: { id: number }) => item.id === operation.id,
            );
            expect(summary.client).toEqual({
              firstname: "Ada",
              lastname: "Lovelace",
              email: "ada@example.com",
            });
            expect(summary).not.toHaveProperty("lines");
            expect(summary).not.toHaveProperty("paymentStatus");
            expect(summary.serviceStartAt).toBe(
              Date.parse(
                type === "rental"
                  ? "2026-10-02T00:00:00Z"
                  : "2026-10-01T12:00:00Z",
              ),
            );
            expect(summary.closedAt).toBe(
              summary.snapshots.find(
                (snapshot: { kind: string }) => snapshot.kind === "invoice",
              ).paidAt,
            );
            expect(summary.serviceEndAt).toBe(
              type === "rental"
                ? Date.parse("2026-10-08T23:59:59Z")
                : summary.closedAt,
            );
          }
        }
        const pending = await fixture.request("/operations", {
          method: "POST",
          headers,
          body: JSON.stringify({
            clientId: client.id,
            type,
            createQuote: true,
            date: "2026-10-01T12:00:00Z",
            ...(type === "rental" && {
              serviceStartAt: "2026-10-02T00:00:00Z",
              serviceEndAt: "2026-10-08T23:59:59Z",
            }),
            lines: [
              {
                description: "Vélo",
                quantity: "1",
                unitPrice: "10",
                vatRate: "0",
                total: "10",
              },
            ],
          }),
        });
        const pendingOperation = await pending.json();
        const rejected = await call(pendingOperation.id, "reject");
        expect(rejected.status).toBe(200);
        const cancelled = await rejected.json();
        expect(cancelled.status).toBe("cancelled");
        expect(cancelled.snapshots[0].status).toBe("rejected");
        expect(cancelled.snapshots[0].payload).toEqual(
          pendingOperation.snapshots[0].payload,
        );
        expect((await call(pendingOperation.id, "complete")).status).toBe(409);
        const listed = await fixture.request(
          `/operations?type=${type}&page=1&limit=10`,
          { headers },
        );
        expect(
          (await listed.json()).operations.find(
            (item: { id: number }) => item.id === cancelled.id,
          ).closedAt,
        ).toBe(cancelled.snapshots[0].updatedAt);
      } finally {
        fixture.cleanup();
      }
    },
  );

  it("returns repair service dates and minimal client data in the paginated HTTP list", async () => {
    const fixture = createClientIntegrationFixture("billing-repair-list");
    try {
      await fixture.reset();
      const client = await fixture.clients.create(
        {
          firstname: "Ada",
          lastname: "Lovelace",
          email: "ada@example.com",
          phonenumber: "0600000000",
        },
        fixture.admin.id,
      );
      const repository = new DrizzleBillingDocumentRepository(
        fixture.database.database,
        new DataProtector(Buffer.alloc(32, 31)),
        fixture.clients,
      );
      const date = "2026-10-01T12:00:00Z";
      const operations: BillingOperationRecord[] = [];
      for (const total of ["60.00", "0.00"]) {
        const operation = await repository.createOperation({
          clientId: client.id,
          type: "repair",
          createQuote: true,
          date,
          serviceStartAt: "2026-10-02T12:00:00Z",
          serviceEndAt: "2026-10-03T12:00:00Z",
          lines: [
            {
              description: "Révision",
              quantity: "1",
              unitPrice: total,
              vatRate: "0",
              total,
            },
          ],
        });
        if (!operation) throw new Error("Operation was not created");
        operations.push(operation);
      }
      const login = await fixture.login();
      const headers = { Cookie: `access_token=${accessTokenFrom(login)}` };
      const list = async () => {
        const response = await fixture.request(
          "/operations?type=repair&page=1&limit=10",
          { headers },
        );
        expect(response.status).toBe(200);
        return response.json();
      };
      const unpaid = await list();
      expect(unpaid).toMatchObject({ page: 1, limit: 10, total: 2 });
      for (const operation of unpaid.operations) {
        expect(operation.serviceStartAt).toBe(
          Date.parse("2026-10-02T12:00:00Z"),
        );
        expect(Number.isSafeInteger(operation.serviceStartAt)).toBe(true);
        expect(operation.serviceEndAt).toBe(Date.parse("2026-10-03T12:00:00Z"));
        expect(operation.closedAt).toBeNull();
        expect(operation.client).toEqual({
          firstname: "Ada",
          lastname: "Lovelace",
          email: "ada@example.com",
        });
        expect(operation).not.toHaveProperty("paymentStatus");
        expect(operation).not.toHaveProperty("lines");
        for (const document of operation.snapshots) {
          expect(document).not.toHaveProperty("payload");
        }
      }
      await repository.acceptQuote(operations[0]!.id);
      for (const operation of operations)
        await repository.completeOperation(operation.id);
      const awaitingPayment = await list();
      const awaiting = awaitingPayment.operations.find(
        (operation: { id: number }) => operation.id === operations[0]!.id,
      );
      expect(awaiting.serviceEndAt).toBe(Date.parse("2026-10-03T12:00:00Z"));
      expect(awaiting.closedAt).toBeNull();
      expect(
        awaiting.snapshots.find(
          (document: { kind: string }) => document.kind === "invoice",
        ).status,
      ).toBe("unpaid");
      const paid = await repository.payOperation(operations[0]!.id, "card");
      const settled = await list();
      for (const operation of settled.operations) {
        const invoice = operation.snapshots.find(
          (document: { kind: string }) => document.kind === "invoice",
        );
        expect(invoice.status).toBe("paid");
        expect(operation.serviceStartAt).toBe(
          Date.parse("2026-10-02T12:00:00Z"),
        );
        expect(operation.serviceEndAt).toBe(Date.parse("2026-10-03T12:00:00Z"));
        expect(operation.closedAt).toBe(invoice.paidAt);
        expect(Number.isSafeInteger(operation.serviceEndAt)).toBe(true);
      }
      expect(
        settled.operations.find(
          (operation: { id: number }) => operation.id === paid?.id,
        )?.closedAt,
      ).toBe(paid?.paidAt);
      const detail = await fixture.request(`/operations/${operations[0]!.id}`, {
        headers,
      });
      const full = await detail.json();
      expect(full.client.phonenumber).toBe("0600000000");
      expect(full.snapshots[0]).toHaveProperty("payload");
      expect(full.lines).toHaveLength(1);
      const pageTwo = await fixture.request(
        "/operations?type=repair&page=2&limit=1",
        { headers },
      );
      expect(await pageTwo.json()).toMatchObject({
        page: 2,
        limit: 1,
        total: 2,
        operations: [{ id: operations[0]!.id }],
      });

      const rental = await repository.createOperation({
        clientId: client.id,
        type: "rental",
        date,
        serviceStartAt: "2026-10-02T12:00:00Z",
        serviceEndAt: "2026-10-03T12:00:00Z",
      });
      const rentalPage = await repository.listOperations({
        type: "rental",
        page: 1,
        limit: 10,
      });
      expect(rentalPage.operations[0]).toMatchObject({
        id: rental?.id,
        serviceStartAt: Date.parse("2026-10-02T12:00:00Z"),
        serviceEndAt: Date.parse("2026-10-03T12:00:00Z"),
      });
    } finally {
      fixture.cleanup();
    }
  });

  it("keeps legacy documents in place without copying or rewriting their JSON", async () => {
    const fixture = createClientIntegrationFixture(
      "billing-legacy-no-migration",
    );
    try {
      await fixture.reset();
      const client = await fixture.clients.create(
        { firstname: "Ada", lastname: "Lovelace", email: "ada@example.com" },
        fixture.admin.id,
      );
      const protector = new DataProtector(Buffer.alloc(32, 31));
      const repository = new DrizzleBillingDocumentRepository(
        fixture.database.database,
        protector,
        fixture.clients,
      );
      const operation = await repository.createOperation({
        clientId: client.id,
        type: "repair",
        date: "2026-10-31T12:00:00Z",
        lines: [
          {
            description: "Révision",
            quantity: "1",
            unitPrice: "50",
            vatRate: "20",
            total: "60",
          },
        ],
      });
      if (!operation) throw new Error("Operation was not created");
      const salt = protector.createSalt();
      const payload = {
        documentNumber: "DEV-LEGACY",
        documentKind: "quote",
        status: "pending",
        paymentStatus: "unpaid",
        client: operation.client,
        lines: operation.lines,
      };
      const encryptedPayload = protector
        .createFieldProtector(salt)
        .encrypt(JSON.stringify(payload));
      fixture.database.sqlite
        .query(
          "INSERT INTO billing_document_snapshots (billing_document_id, kind, status, encrypted_payload, encryption_salt, created_at_ms, updated_at_ms) VALUES (?, 'quote', 'pending', ?, ?, ?, ?)",
        )
        .run(
          operation.id,
          encryptedPayload,
          salt.toString("base64url"),
          Date.now(),
          Date.now(),
        );
      fixture.database.sqlite
        .query("UPDATE billing_documents SET status = 'pending' WHERE id = ?")
        .run(operation.id);
      expect(
        (await repository.getOperation(operation.id))?.snapshots[0]?.payload,
      ).toEqual(payload);
      expect(
        fixture.database.sqlite
          .query("SELECT count(*) AS total FROM billing_quotes")
          .get(),
      ).toEqual({ total: 0 });
      await repository.acceptQuote(operation.id);
      await repository.completeOperation(operation.id);
      const invoiced = await repository.getOperation(operation.id);
      expect(
        invoiced?.snapshots.find(({ kind }) => kind === "invoice")?.payload,
      ).not.toHaveProperty("status");
      await repository.payOperation(operation.id, "card");
      expect(
        fixture.database.sqlite
          .query(
            "SELECT encrypted_payload, status FROM billing_document_snapshots WHERE billing_document_id = ?",
          )
          .get(operation.id),
      ).toEqual({ encrypted_payload: encryptedPayload, status: "accepted" });
      expect(
        fixture.database.sqlite
          .query("SELECT count(*) AS total FROM billing_quotes")
          .get(),
      ).toEqual({ total: 0 });
      expect(
        fixture.database.sqlite
          .query("SELECT count(*) AS total FROM billing_invoices")
          .get(),
      ).toEqual({ total: 1 });
    } finally {
      fixture.cleanup();
    }
  });

  it("accepts zero quotes and invoices only on completion, rolling back invoice failures", async () => {
    const fixture = createClientIntegrationFixture(
      "billing-zero-quote-creation",
    );
    try {
      await fixture.reset();
      const client = await fixture.clients.create(
        { firstname: "Ada", lastname: "Lovelace", email: "ada@example.com" },
        fixture.admin.id,
      );
      const login = await fixture.login();
      const headers = { Cookie: `access_token=${accessTokenFrom(login)}` };
      const input = {
        clientId: client.id,
        type: "repair" as const,
        createQuote: true,
        date: "2026-10-31T12:00:00Z",
        lines: [
          {
            description: "Contrôle gratuit",
            quantity: "1",
            unitPrice: "0",
            vatRate: "20",
            total: "0",
          },
        ],
      };
      const created = await fixture.request("/operations", {
        method: "POST",
        headers,
        body: JSON.stringify(input),
      });
      expect(created.status).toBe(201);
      const operation = await created.json();
      expect(operation).toMatchObject({
        status: "in_progress",
        paymentMethod: null,
        paidAt: null,
      });
      expect(operation.snapshots).toHaveLength(1);
      const quote = operation.snapshots.find(
        (snapshot: { kind: string }) => snapshot.kind === "quote",
      );
      expect(quote.status).toBe("accepted");
      expect(quote.payload.validUntil).toBe(
        quote.createdAt + 30 * 24 * 60 * 60 * 1000,
      );
      const persisted = await fixture.request(`/operations/${operation.id}`, {
        headers,
      });
      expect(await persisted.json()).toEqual(operation);
      fixture.database.sqlite.run(
        "CREATE TRIGGER fail_zero_invoice BEFORE INSERT ON billing_invoices BEGIN SELECT RAISE(ABORT, 'Invoice creation failed'); END;",
      );
      const repository = new DrizzleBillingDocumentRepository(
        fixture.database.database,
        new DataProtector(Buffer.alloc(32, 31)),
        fixture.clients,
      );
      await expect(repository.completeOperation(operation.id)).rejects.toThrow(
        "Invoice creation failed",
      );
      expect(await repository.getOperation(operation.id)).toMatchObject({
        status: "in_progress",
        paidAt: null,
      });
      expect(
        fixture.database.sqlite
          .query("SELECT count(*) AS total FROM billing_documents")
          .get(),
      ).toEqual({ total: 1 });
      expect(
        fixture.database.sqlite
          .query("SELECT count(*) AS total FROM billing_lines")
          .get(),
      ).toEqual({ total: 1 });
      expect(
        fixture.database.sqlite
          .query("SELECT count(*) AS total FROM billing_quotes")
          .get(),
      ).toEqual({ total: 1 });
      fixture.database.sqlite.run("DROP TRIGGER fail_zero_invoice");
      const completed = await fixture.request(
        `/operations/${operation.id}/complete`,
        { method: "POST", headers },
      );
      expect(completed.status).toBe(200);
      const paid = await completed.json();
      expect(paid).toMatchObject({
        status: "paid",
        paymentMethod: "free",
      });
      expect(paid.snapshots).toHaveLength(2);
      const invoice = paid.snapshots.find(
        (snapshot: { kind: string }) => snapshot.kind === "invoice",
      );
      expect(invoice).toMatchObject({
        status: "paid",
        paymentMethod: "free",
        paidAt: paid.paidAt,
        payload: {
          sourceDocumentNumber: quote.payload.documentNumber,
        },
      });
      const persistedPaid = await fixture.request(
        `/operations/${operation.id}`,
        { headers },
      );
      expect(await persistedPaid.json()).toEqual(paid);
    } finally {
      fixture.cleanup();
    }
  });

  it("rejects pending quotes and prevents further actions on cancelled repairs", async () => {
    const fixture = createClientIntegrationFixture("billing-reject-quote");
    try {
      await fixture.reset();
      const client = await fixture.clients.create(
        { firstname: "Ada", lastname: "Lovelace", email: "ada@example.com" },
        fixture.admin.id,
      );
      const login = await fixture.login();
      const headers = { Cookie: `access_token=${accessTokenFrom(login)}` };
      const created = await fixture.request("/operations", {
        method: "POST",
        headers,
        body: JSON.stringify({
          clientId: client.id,
          type: "repair",
          createQuote: true,
          date: "2026-10-31T12:00:00Z",
          lines: [
            {
              description: "Révision",
              quantity: "1",
              unitPrice: "50",
              vatRate: "20",
              total: "60",
            },
          ],
        }),
      });
      expect(created.status).toBe(201);
      const { id } = await created.json();
      const unauthorized = await fixture.request(`/operations/${id}/reject`, {
        method: "POST",
      });
      expect(unauthorized.status).toBe(401);
      const rejected = await fixture.request(`/operations/${id}/reject`, {
        method: "POST",
        headers,
      });
      expect(rejected.status).toBe(200);
      const cancelled = await rejected.json();
      expect(cancelled).toMatchObject({
        status: "cancelled",
        snapshots: [
          {
            kind: "quote",
            status: "rejected",
          },
        ],
      });
      for (const action of ["reject", "accept", "complete"]) {
        const response = await fixture.request(`/operations/${id}/${action}`, {
          method: "POST",
          headers,
        });
        expect(response.status).toBe(409);
      }
      const persisted = await fixture.request(`/operations/${id}`, { headers });
      expect((await persisted.json()).status).toBe("cancelled");
      const listed = await fixture.request(
        "/operations?type=repair&page=1&limit=10",
        { headers },
      );
      const summary = (await listed.json()).operations[0];
      expect(summary.serviceEndAt).toBe(cancelled.snapshots[0].updatedAt);
      expect(Number.isSafeInteger(summary.serviceEndAt)).toBe(true);
      expect(summary.paidAt).toBeNull();
      expect(summary).not.toHaveProperty("lines");
      const listedAgain = await fixture.request(
        "/operations?type=repair&page=1&limit=10",
        { headers },
      );
      expect((await listedAgain.json()).operations[0].serviceEndAt).toBe(
        summary.serviceEndAt,
      );
      const active = await fixture.request(
        "/operations?type=repair&status=pending,in_progress,payment_pending",
        { headers },
      );
      expect(await active.json()).toMatchObject({ total: 0, operations: [] });
      const list = await fixture.request("/operations?status=cancelled", {
        headers,
      });
      expect((await list.json()).total).toBe(1);
    } finally {
      fixture.cleanup();
    }
  });

  it("persists discount lines and settles only exactly zero invoices with or without quotes", async () => {
    const fixture = createClientIntegrationFixture("billing-discounts-zero");
    try {
      await fixture.reset();
      const client = await fixture.clients.create(
        { firstname: "Ada", lastname: "Lovelace", email: "ada@example.com" },
        fixture.admin.id,
      );
      const login = await fixture.login();
      const headers = { Cookie: `access_token=${accessTokenFrom(login)}` };
      for (const createQuote of [false, true]) {
        for (const remaining of ["0.00", "0.01"]) {
          const lines = [
            {
              description: "Pièce A",
              quantity: "1",
              unitPrice: "0.10",
              vatRate: "0",
              total: "0.10",
            },
            {
              description: "Pièce B",
              quantity: "1",
              unitPrice: "0.20",
              vatRate: "0",
              total: "0.20",
            },
            {
              description: "Remise",
              quantity: "1",
              unitPrice: remaining === "0.00" ? "-0.30" : "-0.29",
              vatRate: "0",
              total: remaining === "0.00" ? "-0.30" : "-0.29",
            },
          ];
          const created = await fixture.request("/operations", {
            method: "POST",
            headers,
            body: JSON.stringify({
              clientId: client.id,
              type: "repair",
              createQuote,
              date: "2026-10-31T12:00:00Z",
              lines,
            }),
          });
          expect(created.status).toBe(201);
          const operation = await created.json();
          const zero = remaining === "0.00";
          const automaticallyAccepted = createQuote && zero;
          expect(operation.status).toBe(
            automaticallyAccepted
              ? "in_progress"
              : createQuote
                ? "pending"
                : "in_progress",
          );
          expect(operation.lines[2].total).toBe(lines[2]?.total);
          expect(
            operation.snapshots.some(
              (snapshot: { kind: string }) => snapshot.kind === "invoice",
            ),
          ).toBe(false);
          if (createQuote && !automaticallyAccepted) {
            const accepted = await fixture.request(
              `/operations/${operation.id}/accept`,
              { method: "POST", headers },
            );
            expect(accepted.status).toBe(200);
            expect((await accepted.json()).status).toBe("in_progress");
          }
          if (automaticallyAccepted) {
            expect(operation.snapshots[0]).toMatchObject({
              status: "accepted",
            });
          }
          const completed = await fixture.request(
            `/operations/${operation.id}/complete`,
            { method: "POST", headers },
          );
          expect(completed.status).toBe(200);
          let invoiceOperation = await completed.json();
          expect(invoiceOperation.status).toBe(
            zero ? "paid" : "payment_pending",
          );
          expect(
            invoiceOperation.snapshots.find(
              (snapshot: { kind: string }) => snapshot.kind === "invoice",
            )?.status,
          ).toBe(zero ? "paid" : "unpaid");
          const completedSnapshots = invoiceOperation.snapshots;
          if (!zero) {
            const duplicate = await fixture.request(
              `/operations/${operation.id}/complete`,
              { method: "POST", headers },
            );
            expect(duplicate.status).toBe(409);
            const reloaded = await fixture.request(
              `/operations/${operation.id}`,
              { headers },
            );
            invoiceOperation = await reloaded.json();
            expect(invoiceOperation.snapshots).toEqual(completedSnapshots);
          }
          expect(invoiceOperation).toMatchObject({
            status: zero ? "paid" : "payment_pending",
            paymentMethod: zero ? "free" : null,
          });
          const invoice = invoiceOperation.snapshots.find(
            (snapshot: { kind: string }) => snapshot.kind === "invoice",
          );
          expect(invoice.status).toBe(zero ? "paid" : "unpaid");
          expect(invoiceOperation.snapshots).toHaveLength(createQuote ? 2 : 1);
          expect(invoice.payload.lines[2].total).toBe(lines[2]?.total);
          if (zero) {
            expect(invoice.paymentMethod).toBe("free");
            expect(invoice.payload).not.toHaveProperty("paymentMethod");
            expect(invoice.payload).not.toHaveProperty("paymentStatus");
            expect(invoiceOperation.paidAt).toBeNumber();
            const persisted = await fixture.request(
              `/operations/${operation.id}`,
              { headers },
            );
            expect(await persisted.json()).toEqual(invoiceOperation);
          } else {
            const paid = await fixture.request(
              `/operations/${operation.id}/pay`,
              {
                method: "POST",
                headers,
                body: JSON.stringify({ method: "cash" }),
              },
            );
            expect(paid.status).toBe(200);
            expect(await paid.json()).toMatchObject({
              status: "paid",
              paymentMethod: "cash",
            });
          }
        }
      }
      const freeSale = await fixture.request("/operations", {
        method: "POST",
        headers,
        body: JSON.stringify({
          clientId: client.id,
          type: "sale",
          date: "2026-10-31T12:00:00Z",
          lines: [
            {
              description: "Accessoire",
              quantity: "1",
              unitPrice: "50.00",
              vatRate: "20",
              total: "60.00",
            },
            {
              description: "Remise",
              quantity: "1",
              unitPrice: "-50.00",
              vatRate: "20",
              total: "-60.00",
            },
          ],
        }),
      });
      expect(freeSale.status).toBe(201);
      const sale = await freeSale.json();
      expect(sale.status).toBe("in_progress");
      for (const action of ["complete"]) {
        const response = await fixture.request(
          `/operations/${sale.id}/${action}`,
          { method: "POST", headers },
        );
        expect(response.status).toBe(200);
        if (action === "complete") {
          expect(await response.json()).toMatchObject({
            status: "paid",
            paymentMethod: "free",
          });
        }
      }
      const invalid = await fixture.request("/operations", {
        method: "POST",
        headers,
        body: JSON.stringify({
          clientId: client.id,
          type: "repair",
          date: "2026-10-31T12:00:00Z",
          lines: [
            {
              description: "Remise excessive",
              quantity: "1",
              unitPrice: "-1",
              vatRate: "20",
              total: "-1.20",
            },
          ],
        }),
      });
      expect(invalid.status).toBe(400);
      expect(
        fixture.database.sqlite
          .query("SELECT count(*) AS total FROM billing_documents")
          .get(),
      ).toEqual({ total: 5 });
    } finally {
      fixture.cleanup();
    }
  });

  it("creates an optional pending repair quote atomically through HTTP", async () => {
    const fixture = createClientIntegrationFixture("repair-create-quote");
    try {
      await fixture.reset();
      const client = await fixture.clients.create(
        { firstname: "Ada", lastname: "Lovelace", email: "ada@example.com" },
        fixture.admin.id,
      );
      const login = await fixture.login();
      const headers = { Cookie: `access_token=${accessTokenFrom(login)}` };
      const input = {
        clientId: client.id,
        type: "repair",
        date: "2026-10-31T12:00:00Z",
        comment: "Première ligne\nDeuxième ligne",
        lines: [
          {
            description: "Révision",
            quantity: "1",
            unitPrice: "50.00",
            vatRate: "20.00",
            total: "60.00",
          },
        ],
      };
      for (const createQuote of [true, false, undefined]) {
        const response = await fixture.request("/operations", {
          method: "POST",
          headers,
          body: JSON.stringify({ ...input, createQuote }),
        });
        expect(response.status).toBe(201);
        const operation = await response.json();
        expect(operation.status).toBe(createQuote ? "pending" : "in_progress");
        expect(operation.comment).toBe(input.comment);
        expect(operation.snapshots).toHaveLength(createQuote ? 1 : 0);
        if (createQuote) {
          expect(operation.snapshots[0]).toMatchObject({
            kind: "quote",
            status: "pending",
            payload: { comment: input.comment, lines: input.lines },
          });
          const persisted = await fixture.request(
            `/operations/${operation.id}`,
            { headers },
          );
          expect(await persisted.json()).toEqual(operation);
          const accepted = await fixture.request(
            `/operations/${operation.id}/accept`,
            {
              method: "POST",
              headers,
            },
          );
          expect(accepted.status).toBe(200);
          expect((await accepted.json()).status).toBe("in_progress");
        }
      }
      for (const invalid of [
        { ...input, createQuote: true, lines: [] },
        { ...input, createQuote: true, type: "rental" },
      ]) {
        const response = await fixture.request("/operations", {
          method: "POST",
          headers,
          body: JSON.stringify(invalid),
        });
        expect(response.status).toBe(400);
        expect((await response.json()).code).toBe(
          invalid.type === "rental"
            ? "INVALID_SERVICE_PERIOD"
            : "INVALID_QUOTE",
        );
      }
      const repository = new DrizzleBillingDocumentRepository(
        fixture.database.database,
        new DataProtector(Buffer.alloc(32, 30)),
        fixture.clients,
      );
      await expect(
        repository.createOperation({
          ...input,
          type: "repair",
          createQuote: true,
        }),
      ).rejects.toThrow();
      expect(
        fixture.database.sqlite
          .query("SELECT count(*) AS total FROM billing_documents")
          .get(),
      ).toEqual({ total: 3 });
      expect(
        fixture.database.sqlite
          .query("SELECT count(*) AS total FROM billing_lines")
          .get(),
      ).toEqual({ total: 3 });
      expect(
        fixture.database.sqlite
          .query("SELECT count(*) AS total FROM billing_quotes")
          .get(),
      ).toEqual({ total: 1 });
    } finally {
      fixture.cleanup();
    }
  });

  it("encrypts quote and invoice snapshots and records payment metadata", async () => {
    const fixture = createClientIntegrationFixture("billing-workflow");
    try {
      await fixture.reset();
      const client = await fixture.clients.create(
        {
          firstname: "Ada",
          lastname: "Lovelace",
          email: "ada@example.com",
          phonenumber: "0601020304",
          address: "1 rue du Cycle",
          isProfessional: false,
          siret: null,
          companyName: null,
        },
        fixture.admin.id,
      );
      const repository = new DrizzleBillingDocumentRepository(
        fixture.database.database,
        new DataProtector(Buffer.alloc(32, 31)),
        fixture.clients,
      );
      const operation = await repository.createOperation({
        clientId: client.id,
        type: "repair",
        createQuote: true,
        date: "2026-10-27T12:00:00Z",
        serviceStartAt: "2026-10-28T08:00:00Z",
        serviceEndAt: "2026-10-29T18:00:00Z",
        comment: "Contrôle complet",
        lines: [
          {
            description: "Révision",
            quantity: "1",
            unitPrice: "50.00",
            vatRate: "20.00",
            total: "60.00",
          },
        ],
      });

      expect(operation?.status).toBe("pending");
      if (!operation) throw new Error("Operation was not created");
      const operationId = operation.id;
      const pendingQuote = operation;
      expect(pendingQuote?.status).toBe("pending");
      expect(pendingQuote?.snapshots[0]?.kind).toBe("quote");
      expect(pendingQuote?.snapshots[0]?.status).toBe("pending");
      expect(pendingQuote.snapshots[0]?.payload.validUntil).toBe(
        pendingQuote.snapshots[0]!.createdAt + 30 * 24 * 60 * 60 * 1000,
      );

      const storedSnapshot = fixture.database.sqlite
        .query(
          "SELECT encrypted_payload FROM billing_quotes WHERE billing_document_id = ?",
        )
        .get(operationId) as { encrypted_payload: string };
      expect(storedSnapshot.encrypted_payload).not.toContain("Ada");
      expect(storedSnapshot.encrypted_payload).not.toContain("ada@example.com");
      expect(storedSnapshot.encrypted_payload).not.toContain("1 rue du Cycle");

      const accepted = await repository.acceptQuote(operationId);
      expect(accepted?.status).toBe("in_progress");
      expect(accepted?.snapshots[0]?.status).toBe("accepted");
      expect(accepted?.snapshots[0]?.payload).toEqual(
        pendingQuote.snapshots[0]?.payload,
      );
      expect(accepted?.snapshots[0]?.createdAt).toBe(
        pendingQuote.snapshots[0]?.createdAt,
      );
      expect(accepted?.snapshots[0]?.updatedAt).toBeGreaterThan(
        pendingQuote.snapshots[0]?.updatedAt ?? 0,
      );
      const acceptedStored = fixture.database.sqlite
        .query(
          "SELECT encrypted_payload, encryption_salt, issued_at_ms, status_changed_at_ms, status FROM billing_quotes WHERE billing_document_id = ?",
        )
        .get(operationId) as {
        encrypted_payload: string;
        encryption_salt: string;
        issued_at_ms: number;
        status_changed_at_ms: number;
        status: string;
      };
      expect(acceptedStored.encrypted_payload).toBe(
        storedSnapshot.encrypted_payload,
      );
      expect(acceptedStored.status).toBe("accepted");
      expect(acceptedStored.status_changed_at_ms).toBeGreaterThanOrEqual(
        acceptedStored.issued_at_ms,
      );
      for (const assignment of [
        "encrypted_payload = 'changed'",
        "encryption_salt = 'changed'",
        "issued_at_ms = issued_at_ms + 1",
        "billing_document_id = billing_document_id + 1",
      ]) {
        expect(() =>
          fixture.database.sqlite
            .query(
              `UPDATE billing_quotes SET ${assignment} WHERE billing_document_id = ?`,
            )
            .run(operationId),
        ).toThrow("Quote content is immutable");
      }
      expect(await repository.completeOperation(operationId)).toMatchObject({
        status: "payment_pending",
      });
      fixture.database.sqlite
        .query(
          "UPDATE billing_lines SET description = 'changed after acceptance' WHERE billing_document_id = ?",
        )
        .run(operationId);
      const unpaidOperation = await repository.getOperation(operationId);
      expect(unpaidOperation).toMatchObject({
        status: "payment_pending",
      });
      const unpaidInvoice = unpaidOperation?.snapshots.find(
        ({ kind }) => kind === "invoice",
      );
      expect(unpaidInvoice).toMatchObject({
        status: "unpaid",
        paymentMethod: null,
        paidAt: null,
      });
      const invoiceBeforePayment = fixture.database.sqlite
        .query(
          "SELECT encrypted_payload, encryption_salt, issued_at_ms FROM billing_invoices WHERE billing_document_id = ?",
        )
        .get(operationId) as {
        encrypted_payload: string;
        encryption_salt: string;
        issued_at_ms: number;
      };
      expect(invoiceBeforePayment.encrypted_payload).not.toContain("Ada");
      await expect(
        repository.payOperation(operationId, "free"),
      ).rejects.toThrow("requires a zero invoice total");
      expect(
        (await repository.getOperation(operationId))?.snapshots.find(
          ({ kind }) => kind === "invoice",
        )?.status,
      ).toBe("unpaid");
      const paid = await repository.payOperation(operationId, "bank_transfer");
      expect(paid).toMatchObject({
        status: "paid",
        paymentMethod: "bank_transfer",
      });
      expect(paid).not.toHaveProperty("paymentStatus");
      expect(
        fixture.database.sqlite
          .query("PRAGMA table_info(billing_documents)")
          .all(),
      ).not.toContainEqual(expect.objectContaining({ name: "payment_status" }));
      const invoice = paid?.snapshots.find(({ kind }) => kind === "invoice");
      const invoiceLines = invoice?.payload.lines as
        | Array<{ description: string }>
        | undefined;
      expect(invoice?.status).toBe("paid");
      expect(invoice?.payload).not.toHaveProperty("status");
      expect(invoice?.paymentMethod).toBe("bank_transfer");
      expect(invoice?.payload).toEqual(unpaidInvoice?.payload);
      expect(invoice?.createdAt).toBe(unpaidInvoice?.createdAt);
      const paidInvoiceRow = fixture.database.sqlite
        .query(
          "SELECT encrypted_payload, encryption_salt, issued_at_ms, paid_at_ms, status, payment_method FROM billing_invoices WHERE billing_document_id = ?",
        )
        .get(operationId) as typeof invoiceBeforePayment & {
        paid_at_ms: number;
        status: string;
        payment_method: string;
      };
      expect(paidInvoiceRow).toMatchObject({
        ...invoiceBeforePayment,
        status: "paid",
        payment_method: "bank_transfer",
      });
      expect(paidInvoiceRow.paid_at_ms).toBeGreaterThanOrEqual(
        paidInvoiceRow.issued_at_ms,
      );
      for (const assignment of [
        "encrypted_payload = 'changed'",
        "encryption_salt = 'changed'",
        "issued_at_ms = issued_at_ms + 1",
        "billing_document_id = billing_document_id + 1",
      ]) {
        expect(() =>
          fixture.database.sqlite
            .query(
              `UPDATE billing_invoices SET ${assignment} WHERE billing_document_id = ?`,
            )
            .run(operationId),
        ).toThrow("Invoice content is immutable");
      }
      expect(() =>
        fixture.database.sqlite
          .query(
            "UPDATE billing_quotes SET status = 'invalid' WHERE billing_document_id = ?",
          )
          .run(operationId),
      ).toThrow();
      expect(() =>
        fixture.database.sqlite
          .query(
            "UPDATE billing_invoices SET status = 'pending' WHERE billing_document_id = ?",
          )
          .run(operationId),
      ).toThrow();
      expect(() =>
        fixture.database.sqlite
          .query(
            "UPDATE billing_invoices SET paid_at_ms = NULL WHERE billing_document_id = ?",
          )
          .run(operationId),
      ).toThrow();
      expect(
        fixture.database.sqlite
          .query("SELECT count(*) AS total FROM billing_document_snapshots")
          .get(),
      ).toEqual({ total: 0 });
      expect(invoiceLines?.[0]?.description).toBe("Révision");

      const storedPayment = fixture.database.sqlite
        .query(
          "SELECT status, payment_method, paid_at_ms FROM billing_documents WHERE id = ?",
        )
        .get(operationId) as {
        status: string;
        payment_method: string;
        paid_at_ms: number | null;
      };
      expect(storedPayment).toMatchObject({
        status: "paid",
        payment_method: "bank_transfer",
      });
      expect(storedPayment.paid_at_ms).not.toBeNull();
      expect(await repository.getOperation(operationId)).toEqual(paid);
      expect(
        fixture.database.sqlite.query("PRAGMA foreign_key_check").all(),
      ).toEqual([]);
    } finally {
      fixture.cleanup();
    }
  });

  it("supports direct payment and requires a complete rental period", async () => {
    const fixture = createClientIntegrationFixture("billing-workflow-fast-pay");
    try {
      await fixture.reset();
      const client = await fixture.clients.create(
        {
          firstname: "Grace",
          lastname: "Hopper",
          email: "grace@example.com",
          phonenumber: "0605060708",
          isProfessional: false,
          siret: null,
          companyName: null,
        },
        fixture.admin.id,
      );
      const repository = new DrizzleBillingDocumentRepository(
        fixture.database.database,
        new DataProtector(Buffer.alloc(32, 31)),
        fixture.clients,
      );

      await expect(
        repository.createOperation({
          clientId: client.id,
          type: "rental",
          date: "2026-10-27T12:00:00Z",
          lines: [],
        }),
      ).rejects.toBeInstanceOf(BillingOperationInputError);

      const operation = await repository.createOperation({
        clientId: client.id,
        type: "sale",
        createQuote: true,
        date: "2026-10-27T12:00:00Z",
        lines: [
          {
            description: "Vélo",
            quantity: "1",
            unitPrice: "100.00",
            vatRate: "20.00",
            total: "120.00",
          },
        ],
      });
      if (!operation) throw new Error("Operation was not created");
      await repository.acceptQuote(operation.id);
      await repository.completeOperation(operation.id);
      const paid = await repository.payOperation(operation.id, "cash");

      expect(paid?.status).toBe("paid");
      expect(paid?.paymentMethod).toBe("cash");
      expect(paid?.snapshots.map(({ kind }) => kind)).toEqual([
        "quote",
        "invoice",
      ]);
    } finally {
      fixture.cleanup();
    }
  });
});
