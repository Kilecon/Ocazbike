import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { BillingSnapshotDTO } from "../../../services/types";
import { OperationDocuments } from "./OperationDocuments";

const labels = {
  quote: "Open quote",
  invoice: "Open invoice",
  missingQuote: "No quote",
  missingInvoice: "No invoice",
};

describe("repair document icons", () => {
  it.each([
    ["sale", "sales"],
    ["purchase", "buybacks"],
    ["rental", "rentals"],
  ] as const)(
    "opens %s documents from both grid and modal on their own routes",
    (type, path) => {
      for (const showLabels of [true, false]) {
        const html = renderToStaticMarkup(
          <OperationDocuments
            operationId={42}
            type={type}
            snapshots={[{ kind: "quote" }, { kind: "invoice" }]}
            labels={labels}
            showLabels={showLabels}
          />,
        );
        expect(html).toContain(`href="/admin/${path}/42/documents/quote"`);
        expect(html).toContain(`href="/admin/${path}/42/documents/invoice"`);
        expect(html.match(/target="_blank"/g)).toHaveLength(2);
      }
    },
  );

  it("provides labelled document buttons for the repair modal using the grid routes", () => {
    const html = renderToStaticMarkup(
      <OperationDocuments
        operationId={42}
        snapshots={[{ kind: "quote" }, { kind: "invoice" }]}
        labels={labels}
        showLabels
      />,
    );
    expect(html).toContain('href="/admin/repairs/42/documents/quote"');
    expect(html).toContain('href="/admin/repairs/42/documents/invoice"');
    expect(html).toContain("<span>Open quote</span>");
    expect(html).toContain("<span>Open invoice</span>");
    expect(html.match(/target="_blank"/g)).toHaveLength(2);
    expect(html.match(/rel="noopener noreferrer"/g)).toHaveLength(2);
  });

  it("opens each available document in a separate tab", () => {
    const snapshots: BillingSnapshotDTO[] = ["quote", "invoice"].map(
      (kind) => ({
        kind: kind === "quote" ? "quote" : "invoice",
        status: "pending",
        payload: {},
        createdAt: 0,
        updatedAt: 0,
      }),
    );
    const html = renderToStaticMarkup(
      <OperationDocuments
        operationId={42}
        snapshots={snapshots}
        labels={labels}
      />,
    );
    expect(html).toContain('href="/admin/repairs/42/documents/quote"');
    expect(html).toContain('href="/admin/repairs/42/documents/invoice"');
    expect(html.match(/target="_blank"/g)).toHaveLength(2);
    expect(html.match(/rel="noopener noreferrer"/g)).toHaveLength(2);
    expect(html).toContain('aria-label="Open quote"');
    expect(html).toContain('aria-label="Open invoice"');
  });

  it("shows crossed, non-interactive icons when documents are absent", () => {
    const html = renderToStaticMarkup(
      <OperationDocuments operationId={42} snapshots={[]} labels={labels} />,
    );
    expect(html).not.toContain("<a ");
    expect(html).toContain('aria-label="No quote"');
    expect(html).toContain('aria-label="No invoice"');
    expect(html.match(/lucide-file-x/g)).toHaveLength(2);
  });

  it("keeps the invoice unavailable while only a quote exists", () => {
    const html = renderToStaticMarkup(
      <OperationDocuments
        operationId={42}
        snapshots={[
          {
            kind: "quote",
          },
        ]}
        labels={labels}
      />,
    );
    expect(html.match(/<a /g)).toHaveLength(1);
    expect(html).toContain('aria-label="No invoice"');
  });
});
