import { afterEach, describe, expect, it } from "bun:test";
import { act } from "react";
import { createDom, type TestDom } from "@/shared/test/dom";
import { json } from "@/shared/test/mockFetch";
import { AdminToastProvider } from "@/shared/ui/AdminToast";
import { OperationStatusTabs } from "./OperationTabs";
import { invalidateOperations, useOperationCountsQuery } from "./queries";

let dom: TestDom | undefined;
const originalFetch = globalThis.fetch;
afterEach(async () => {
  await dom?.cleanup();
  dom = undefined;
  globalThis.fetch = originalFetch;
});

describe("operation counts", () => {
  it("reloads operation totals when operations change", async () => {
    let total = 4;
    let requestCount = 0;
    globalThis.fetch = Object.assign(
      async (input: RequestInfo | URL) => {
        if (new URL(String(input)).pathname === "/operations") requestCount++;
        return json({ operations: [], total });
      },
      { preconnect: globalThis.fetch.preconnect },
    );
    dom = await createDom("/admin/repairs");
    await dom.render(
      <AdminToastProvider>
        <OperationStatusTabs
          selected="all"
          onSelect={() => {}}
          id="operation-tabs"
          panelId="operation-panel"
          type="repair"
        />
      </AdminToastProvider>,
    );
    expect(dom.container.textContent).toContain("Tous (4)");

    total = 9;
    await act(async () => {
      if (dom) void invalidateOperations(dom.queryClient);
    });

    expect(requestCount).toBe(2);
    expect(dom.container.textContent).toContain("Tous (9)");
  });

  it("keeps the newest operation counts when an older refresh resolves late", async () => {
    const pending: ((response: Response) => void)[] = [];
    const signals: AbortSignal[] = [];
    globalThis.fetch = ((_url, options) => {
      signals.push(options?.signal as AbortSignal);
      return new Promise<Response>((resolve) => pending.push(resolve));
    }) as typeof fetch;
    function Counts() {
      const counts = useOperationCountsQuery().data;
      return <output>{counts ? JSON.stringify(counts) : "none"}</output>;
    }
    dom = await createDom();
    await dom.render(
      <AdminToastProvider>
        <Counts />
      </AdminToastProvider>,
    );
    await act(async () => pending[0]?.(json({ repair: { pending: 1 } })));
    expect(dom.container.textContent).toContain('"pending":1');
    for (let refresh = 0; refresh < 2; refresh++) {
      await act(async () => {
        if (dom) void invalidateOperations(dom.queryClient);
      });
    }
    expect(signals[1]?.aborted).toBe(true);
    await act(async () => pending[2]?.(json({ repair: { pending: 7 } })));
    expect(dom.container.textContent).toContain('"pending":7');
    await act(async () => pending[1]?.(json({ repair: { pending: 3 } })));
    expect(dom.container.textContent).toContain('"pending":7');
  });
});
