import { afterEach, describe, expect, it, spyOn } from "bun:test";
import { CreateOperationForm } from "@/features/operations/create/CreateOperationForm";
import { OperationDetail } from "@/features/operations/detail/OperationDetail";
import fr from "@/shared/i18n/translations/fr.json";
import {
  createDom,
  domQueries,
  setValue,
  type TestDom,
} from "@/shared/test/dom";
import { json } from "@/shared/test/mockFetch";
import {
  renderTranslated,
  restoreBrowserGlobalsAfterEach,
  setBrowserLocation,
  setLightTheme,
} from "@/shared/test/render";
import { AdminToastProvider } from "@/shared/ui/AdminToast";
import { BillingLinesEditor } from "./create/BillingLinesEditor";
import { OperationLinesTable } from "./detail/OperationLinesTable";
import { OperationEmailButton } from "./OperationEmail";
import { operationFiltersFromSearch } from "./OperationFilters";
import { OperationsPage } from "./OperationsPage";
import { createBillingOperation, RepairsPage } from "./testing";
import type { BillingOperationDTO } from "./types";

let dom: TestDom | undefined;
const originalFetch = globalThis.fetch;
afterEach(async () => {
  await dom?.cleanup();
  dom = undefined;
  globalThis.fetch = originalFetch;
});
const { element, button, click } = domQueries(() => dom);

restoreBrowserGlobalsAfterEach("window", "document");

describe("operation status tabs", () => {
  it.each([
    ["repairs", "repair"],
    ["sales", "sale"],
    ["buybacks", "purchase"],
    ["rentals", "rental"],
  ] as const)(
    "renders %s with all operations selected by default",
    (path, type) => {
      setBrowserLocation(`/admin/${path}`);
      setLightTheme();
      const html = renderTranslated(
        <AdminToastProvider>
          <OperationsPage
            type={type}
            selectedOperationId={null}
            onSelectOperation={() => {}}
          />
        </AdminToastProvider>,
      );

      expect(html.match(/role="tab"/g)).toHaveLength(4);
      expect(html).toMatch(/id="[^"]+-all"[^>]*aria-selected="true"/);
      expect(html).toContain('role="tabpanel"');
      expect(html).toContain('aria-haspopup="menu"');
      expect(html).not.toContain(
        fr.operationRemoveFilter.replace("{{filter}}", fr.status_pending),
      );
    },
  );

  it("opens a sidebar status link on its tab without a redundant status filter", () => {
    setBrowserLocation("/admin/repairs", "?status=in_progress");
    setLightTheme();
    const html = renderTranslated(
      <AdminToastProvider>
        <OperationsPage
          type="repair"
          filters={operationFiltersFromSearch({ status: "in_progress" })}
          selectedOperationId={null}
          onSelectOperation={() => {}}
        />
      </AdminToastProvider>,
    );

    expect(html).toMatch(/id="[^"]+-in_progress"[^>]*aria-selected="true"/);
    expect(html).not.toContain('aria-haspopup="menu"');
    expect(html).not.toContain(
      fr.operationRemoveFilter.replace("{{filter}}", fr.status_in_progress),
    );
  });
});

const operation = createBillingOperation();

function renderDetail(value: BillingOperationDTO) {
  return renderTranslated(
    <OperationDetail
      operation={value}
      loading={false}
      saving={false}
      title="Locations"
      language="fr"
      onBack={() => {}}
      onAction={async () => {}}
      onReload={async () => {}}
    />,
  );
}

describe("rental repair-style UI", () => {
  it.each(["repair", "sale", "purchase", "rental"] as const)(
    "displays saved service dates for %s ahead of automatic dates",
    (type) => {
      const html = renderDetail({ ...operation, type });
      expect(html).toContain("02/10/2026");
      expect(html).toContain("08/10/2026");
    },
  );
  it("defaults to an optional quote and keeps both planned rental dates required", () => {
    const html = renderTranslated(
      <AdminToastProvider>
        <CreateOperationForm
          type="rental"
          saving={false}
          onCancel={() => {}}
          onSubmit={async () => {}}
        />
      </AdminToastProvider>,
    );
    expect(html).toMatch(/id="operation-service-start"[^>]*required=""/);
    expect(html).toMatch(/id="operation-service-end"[^>]*required=""/);
    expect(html).toMatch(/id="operation-date"[^>]*placeholder="jj\/mm\/aaaa"/);
    expect(html).toContain("Passer à la facturation");
    expect(html).not.toContain('id="operation-line-description-1"');
  });

  it("shows separate planned and actual dates, document tabs and completion after Close", () => {
    const html = renderDetail(operation);
    expect(html).toContain("Création: 01/10/2026");
    expect(html).toContain("Clôture: —");
    expect(html).toContain("02/10/2026");
    expect(html).toContain("08/10/2026");
    expect(html).not.toContain("12:00");
    expect(html).toContain('href="/admin/rentals/42/documents/quote"');
    expect(html).toContain('target="_blank"');
    expect(html).not.toContain("Retour à la liste");
    expect(html.indexOf("Fermer")).toBeLessThan(html.indexOf("Terminer"));
  });

  it("does not stringify malformed document numbers as objects", () => {
    const quoteSnapshot = operation.snapshots.find(
      ({ kind }) => kind === "quote",
    );
    if (!quoteSnapshot) throw new Error("Expected a quote snapshot");
    const html = renderDetail({
      ...operation,
      snapshots: [
        {
          ...quoteSnapshot,
          payload: { documentNumber: { unexpected: true } },
        },
      ],
    });
    expect(html).not.toContain("[object Object]");
  });

  it("places each clickable document icon in its corresponding document row", () => {
    const html = renderDetail({
      ...operation,
      snapshots: [
        {
          kind: "quote",
          status: "accepted",
          createdAt: 1,
          updatedAt: 1,
          payload: { documentNumber: "DEV-42" },
        },
        {
          kind: "invoice",
          status: "payment_pending",
          createdAt: 2,
          updatedAt: 2,
          payload: { documentNumber: "FAC-42" },
        },
      ],
    });
    const rows = html.match(/<article[\s\S]*?<\/article>/g);
    expect(rows).toHaveLength(2);
    for (const [index, kind, number] of [
      [0, "quote", "DEV-42"],
      [1, "invoice", "FAC-42"],
    ] as const) {
      const row = rows?.[index];
      expect(row).toContain(number);
      expect(row).toContain(`/admin/rentals/42/documents/${kind}`);
      expect(row?.match(/<a /g)).toHaveLength(1);
      expect(row).toContain('target="_blank"');
      expect(row).toContain("lucide-file-text");
    }
    expect(html).not.toContain(`<span>${fr.openQuote}</span>`);
    expect(html).not.toContain(`<span>${fr.openInvoice}</span>`);
    expect(html.indexOf(fr.billingDocuments)).toBeLessThan(
      html.indexOf(`>${fr.client}</h2>`),
    );
  });

  it("uses invoice payment for closure without overwriting the planned period", () => {
    const html = renderDetail({
      ...operation,
      status: "paid",
      snapshots: [
        ...operation.snapshots,
        {
          kind: "invoice",
          status: "paid",
          createdAt: Date.UTC(2026, 9, 10, 12),
          updatedAt: Date.UTC(2026, 9, 31, 12),
          paidAt: Date.UTC(2026, 9, 31, 12),
          paymentMethod: "cash",
          payload: {},
        },
      ],
    });
    expect(html).toContain("Clôture: 31/10/2026");
    expect(html).toContain("02/10/2026");
    expect(html).toContain("08/10/2026");
    expect(html).toContain('href="/admin/rentals/42/documents/invoice"');
    expect(html).not.toContain(">Terminer<");
  });
});

describe("invoice email on payment", () => {
  const payable = (email: string) =>
    renderDetail({
      ...operation,
      status: "payment_pending",
      client: { ...operation.client, email },
    });

  it("checks the invoice email by default when the client has an address", () => {
    const html = payable("ada@example.test");
    expect(html).toMatch(
      /id="operation-send-invoice-email"[^>]*type="checkbox"[^>]*checked=""/,
    );
    expect(html).toMatch(
      /id="operation-send-invoice-email"[^>]*role="switch"[^>]*aria-checked="true"/,
    );
    expect(html).not.toContain(fr.clientEmailMissingHint);
    expect(html.indexOf('id="operation-send-invoice-email"')).toBeLessThan(
      html.indexOf("<footer"),
    );
    expect(html.match(/<footer[\s\S]*?<\/footer>/)?.[0]).not.toContain(
      'id="operation-send-invoice-email"',
    );
  });

  it("disables the invoice email when the client has no address", () => {
    const html = payable("");
    expect(html).toMatch(
      /id="operation-send-invoice-email"[^>]*type="checkbox"(?![^>]*\schecked="")[^>]*aria-checked="false"[^>]*disabled=""/,
    );
    expect(html).toContain(fr.clientEmailMissingHint.replace("'", "&#x27;"));
  });
});

describe("billing email button availability", () => {
  it.each([
    [
      "blocks another send on the same Paris day across UTC midnight",
      "2026-11-24T00:30:00Z",
      "2026-11-23T23:30:00Z",
      true,
    ],
    [
      "allows a resend on the next Paris day even within 24 hours",
      "2026-11-24T23:30:00Z",
      "2026-11-24T22:30:00Z",
      false,
    ],
  ] as const)("%s", (_label, now, sentAt, disabled) => {
    const clock = spyOn(Date, "now").mockReturnValue(Date.parse(now));
    try {
      const html = renderTranslated(
        <AdminToastProvider>
          <OperationEmailButton
            operationId={42}
            clientEmail="ada@example.test"
            snapshots={[{ kind: "invoice", emailSentAt: Date.parse(sentAt) }]}
            language="fr"
          />
        </AdminToastProvider>,
      );
      expect(html.includes('disabled=""')).toBe(disabled);
      if (disabled)
        expect(html).toContain(
          fr.emailErrorAlreadySentToday.replaceAll("'", "&#x27;"),
        );
    } finally {
      clock.mockRestore();
    }
  });

  it("allows sending a new invoice when only the quote was emailed today", () => {
    const html = renderTranslated(
      <AdminToastProvider>
        <OperationEmailButton
          operationId={42}
          clientEmail="ada@example.test"
          snapshots={[
            { kind: "quote", emailSentAt: Date.now() },
            { kind: "invoice", emailSentAt: null },
          ]}
          language="fr"
        />
      </AdminToastProvider>,
    );
    expect(html).not.toContain('disabled=""');
    expect(html).toContain(fr.sendInvoiceEmailAction);
  });
});

describe("operation workflows", () => {
  it("accepts a quote, completes the operation, and pays the invoice with the chosen method", async () => {
    const baseOperation = createBillingOperation();
    const [baseQuote] = baseOperation.snapshots;
    if (!baseQuote) throw new Error("Expected a quote snapshot");
    let operation = createBillingOperation({
      type: "repair",
      date: Date.UTC(2026, 1, 1),
      serviceStartAt: null,
      serviceEndAt: null,
      comment: null,
      status: "pending",
      lines: baseOperation.lines.map((line) => ({
        ...line,
        description: "Repair",
      })),
      client: { ...baseOperation.client, lastname: "Martin" },
      snapshots: [
        {
          ...baseQuote,
          status: "pending",
          createdAt: 1,
          updatedAt: 1,
        },
      ],
    });
    const calls: { path: string; body?: unknown }[] = [];
    globalThis.fetch = (async (url, options) => {
      const path = new URL(String(url)).pathname;
      if (options?.method === "POST") {
        calls.push({
          path,
          body: options.body ? JSON.parse(String(options.body)) : undefined,
        });
        if (path.endsWith("/accept"))
          operation = { ...operation, status: "in_progress" };
        if (path.endsWith("/complete"))
          operation = {
            ...operation,
            status: "payment_pending",
            snapshots: [
              ...operation.snapshots,
              {
                kind: "invoice",
                status: "payment_pending",
                createdAt: 1,
                updatedAt: 1,
                payload: {},
              },
            ],
          };
        if (path.endsWith("/pay"))
          return json({
            ...operation,
            status: "paid",
            paymentMethod: "cash",
          });
        return json(operation);
      }
      if (path === "/operations/42") return json(operation);
      if (path === "/operations") return json({ operations: [], total: 0 });
      return json({});
    }) as typeof fetch;
    dom = await createDom("/admin/repairs/42");
    await dom.render(
      <AdminToastProvider>
        <RepairsPage initialSelection={42} />
      </AdminToastProvider>,
    );
    await click(button(fr.acceptQuote));
    expect(calls[0]?.path).toBe("/operations/42/accept");
    expect(dom.container.textContent).toContain(fr.quoteAccepted);
    await click(button(fr.completeOperation));
    expect(calls[1]?.path).toBe("/operations/42/complete");
    await setValue(element("dialog select"), "cash");
    expect(
      (element("#operation-send-invoice-email") as HTMLInputElement).checked,
    ).toBe(true);
    expect(element("#operation-send-invoice-email").getAttribute("role")).toBe(
      "switch",
    );
    await click(element("#operation-send-invoice-email"));
    await click(button(fr.markPaid));
    expect(calls[2]).toEqual({
      path: "/operations/42/pay",
      body: { method: "cash" },
    });
    expect(dom.container.textContent).toContain(fr.operationPaid);
    expect(dom.container.textContent).not.toContain(
      fr.invoiceEmailSent.replace("{{email}}", operation.client.email),
    );
    expect(dom.container.querySelector("dialog select")).toBeNull();
  });

  it("sends or resends the latest billing document from the operations table", async () => {
    const base = createBillingOperation();
    const sentAt = Date.now();
    const listItem = (
      id: number,
      email: string,
      emailSentAt: number | null,
    ) => ({
      ...base,
      id,
      closedAt: null,
      client: { firstname: "Ada", lastname: "Martin", email },
      lines: [],
      snapshots: [
        {
          kind: "quote",
          status: "accepted",
          createdAt: 1,
          updatedAt: 1,
          emailSentAt: null,
        },
        {
          kind: "invoice",
          status: "payment_pending",
          createdAt: 1,
          updatedAt: 1,
          emailSentAt,
        },
      ],
    });
    const calls: { path: string; body?: unknown }[] = [];
    globalThis.fetch = (async (url, options) => {
      const path = new URL(String(url)).pathname;
      if (options?.method === "POST") {
        calls.push({ path, body: JSON.parse(String(options.body)) });
        return calls.length === 1
          ? json({ kind: "invoice", sentAt })
          : json(
              { code: "EMAIL_ALREADY_SENT_TODAY", message: "already sent" },
              429,
            );
      }
      if (path === "/operations")
        return json({
          operations: [
            listItem(7, "ada@example.test", Date.UTC(2026, 0, 2, 12)),
            listItem(8, "", null),
          ],
          total: 2,
        });
      return json({});
    }) as typeof fetch;
    dom = await createDom("/admin/repairs");
    await dom.render(
      <AdminToastProvider>
        <RepairsPage />
      </AdminToastProvider>,
    );
    const [resend, send] = [
      button(fr.resendDocumentEmail),
      button(fr.sendDocumentEmail),
    ] as HTMLButtonElement[];
    expect(send?.disabled).toBe(true);
    expect(send?.title).toBe(fr.clientEmailMissingHint);
    expect(dom.container.textContent).toContain(fr.emailNotSent);
    await click(resend as HTMLElement);
    expect(calls[0]).toEqual({
      path: "/operations/7/emails",
      body: { kind: "invoice" },
    });
    expect(dom.container.querySelector("dialog")).toBeNull();
    expect(dom.container.textContent).toContain(
      fr.invoiceEmailSent.replace("{{email}}", "ada@example.test"),
    );
    expect(resend?.disabled).toBe(true);
    expect(resend?.title).toBe(fr.emailErrorAlreadySentToday);
    await click(resend as HTMLElement);
    expect(calls).toHaveLength(1);
  });
});

describe("operation billing alignment", () => {
  it("right-aligns numeric headers and values in the detail table", () => {
    const html = renderTranslated(
      <OperationLinesTable
        lines={[
          {
            id: 1,
            billingDocumentId: 1,
            description: "Pneu",
            quantity: "2",
            unitPrice: "24",
            vatRate: "20",
            discount: "0",
            total: "57.60",
          },
        ]}
      />,
    );
    expect(html.match(/scope="col" class="text-right"/g)).toHaveLength(4);
    expect(html).toContain('class="text-right tabular-nums"');
  });

  it("right-aligns numeric inputs in the billing editor", () => {
    const html = renderTranslated(
      <BillingLinesEditor
        rows={[
          {
            line: {
              id: 1,
              description: "Pneu",
              quantity: "2",
              unitPrice: "24",
              vatRate: "20",
            },
            billingLine: {
              description: "Pneu",
              quantity: "2",
              unitPrice: "24",
              vatRate: "20",
              discount: "0",
              total: "57.60",
            },
            discountLine: undefined,
          },
        ]}
        total={57.6}
        onUpdate={() => {}}
        onRemove={() => {}}
        onAdd={() => {}}
      />,
    );
    expect(
      html.match(/text-right tabular-nums/g)?.length,
    ).toBeGreaterThanOrEqual(5);
  });
});
