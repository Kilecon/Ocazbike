import { afterEach, describe, expect, it } from "bun:test";
import { EMPTY_STORE_INFORMATION } from "@/features/store-information/types";
import fr from "@/shared/i18n/translations/fr.json";
import { createDom, domQueries, type TestDom } from "@/shared/test/dom";
import { json } from "@/shared/test/mockFetch";
import { AdminToastProvider } from "@/shared/ui/AdminToast";
import { OperationDocumentPage } from "./OperationDocumentPage";

let dom: TestDom | undefined;
const originalFetch = globalThis.fetch;
afterEach(async () => {
  await dom?.cleanup();
  dom = undefined;
  globalThis.fetch = originalFetch;
});
const { button } = domQueries(() => dom);

describe("operation document page", () => {
  it("shows a missing operation document without enabling print", async () => {
    globalThis.fetch = (async (url) =>
      new URL(String(url)).pathname === "/operations/9"
        ? json({ snapshots: [] })
        : json(EMPTY_STORE_INFORMATION)) as typeof fetch;
    dom = await createDom();
    await dom.render(
      <AdminToastProvider>
        <OperationDocumentPage operationId={9} kind="invoice" />
      </AdminToastProvider>,
    );
    expect(dom.container.querySelector('[role="alert"]')?.textContent).toBe(
      fr.missingInvoice,
    );
    expect((button(fr.printDocument) as HTMLButtonElement).disabled).toBe(true);
  });
});
